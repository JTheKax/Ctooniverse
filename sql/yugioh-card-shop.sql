-- CTooniverse Yu-Gi-Oh! collectible booster shop (separate from immutable Arena starters).
-- Fictional Cartoon Coin prices; original card artwork stays in the existing self-hosted cache.
create table if not exists public.yugioh_shop_packs (
 id text primary key check (id ~ '^[a-z][a-z0-9-]{1,40}$'),
 name text not null,
 description text not null default '',
 theme text not null default 'violet',
 hero_image_id bigint not null references public.yugioh_cards(card_id),
 price_coins integer not null check (price_coins between 1 and 100000),
 card_count integer not null default 5 check (card_count between 1 and 10),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.yugioh_shop_pack_cards (
 pack_id text not null references public.yugioh_shop_packs(id) on delete cascade,
 card_id bigint not null references public.yugioh_cards(card_id),
 primary key (pack_id,card_id)
);
create table if not exists public.yugioh_player_cards (
 user_id uuid not null references auth.users(id) on delete cascade,
 card_id bigint not null references public.yugioh_cards(card_id),
 quantity integer not null default 1 check (quantity between 1 and 1000000),
 acquired_at timestamptz not null default now(),
 primary key (user_id,card_id)
);
create table if not exists public.yugioh_pack_openings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 pack_id text not null references public.yugioh_shop_packs(id),
 pack_name text not null,
 price_coins integer not null check (price_coins>0),
 card_ids bigint[] not null check (cardinality(card_ids) between 1 and 10),
 balance_after bigint not null check (balance_after>=0),
 created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
create index if not exists yugioh_pack_openings_user_time_idx
 on public.yugioh_pack_openings (user_id,created_at desc);
create index if not exists yugioh_player_cards_user_time_idx
 on public.yugioh_player_cards (user_id,acquired_at desc);

alter table public.yugioh_shop_packs enable row level security;
alter table public.yugioh_shop_pack_cards enable row level security;
alter table public.yugioh_player_cards enable row level security;
alter table public.yugioh_pack_openings enable row level security;
revoke all on public.yugioh_shop_packs,public.yugioh_shop_pack_cards,
 public.yugioh_player_cards,public.yugioh_pack_openings from PUBLIC,anon,authenticated;
grant select on public.yugioh_shop_packs to anon,authenticated;
grant select on public.yugioh_player_cards,public.yugioh_pack_openings to authenticated;

drop policy if exists "Anyone may read published YuGiOh packs" on public.yugioh_shop_packs;
create policy "Anyone may read published YuGiOh packs" on public.yugioh_shop_packs
 for select to anon,authenticated using (is_active=true);
drop policy if exists "Players may read only their YuGiOh collection" on public.yugioh_player_cards;
create policy "Players may read only their YuGiOh collection" on public.yugioh_player_cards
 for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Players may read only their YuGiOh pack history" on public.yugioh_pack_openings;
create policy "Players may read only their YuGiOh pack history" on public.yugioh_pack_openings
 for select to authenticated using ((select auth.uid())=user_id);

insert into public.yugioh_shop_packs
 (id,name,description,theme,hero_image_id,price_coins,card_count)
values
 ('duelist-essentials','Duelist Essentials','Five random cards from the full English Duelist card catalog.','violet',46986414,250,5),
 ('dragon-legends','Dragon Legends','Five Dragon and Dragon-themed cards, including Dragon support.','azure',89631139,400,5),
 ('spellcaster-vault','Spellcaster Vault','Five Spellcaster and magician-themed cards.','plum',46986414,400,5),
 ('toon-theater','Toon Theater','Five Toon-themed cards from Pegasus’s world.','gold',21296502,450,5)
on conflict (id) do update
 set name=excluded.name,description=excluded.description,theme=excluded.theme,
 hero_image_id=excluded.hero_image_id,price_coins=excluded.price_coins,card_count=excluded.card_count;

insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'duelist-essentials',c.card_id
from public.yugioh_cards c where c.card_type not in ('Skill Card','Token')
on conflict do nothing;
insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'dragon-legends',c.card_id from public.yugioh_cards c
where c.card_type not in ('Skill Card','Token')
 and (c.race ilike '%Dragon%' or c.archetype ilike '%Blue-Eyes%'
      or c.archetype ilike '%Red-Eyes%' or c.name ilike '%Dragon%')
on conflict do nothing;
insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'spellcaster-vault',c.card_id from public.yugioh_cards c
where c.card_type not in ('Skill Card','Token')
 and (c.race ilike '%Spellcaster%' or c.archetype ilike '%Magician%'
      or c.name ilike '%Magician%')
on conflict do nothing;
insert into public.yugioh_shop_pack_cards(pack_id,card_id)
select 'toon-theater',c.card_id from public.yugioh_cards c
where c.card_type not in ('Skill Card','Token')
 and (c.archetype ilike '%Toon%' or c.name ilike '%Toon%')
on conflict do nothing;

-- Only this authenticated, server-side checkout may debit coins and mint Yu-Gi-Oh cards.
-- Row locking and request IDs protect balances and prevent duplicate charges on a retry.
create or replace function public.open_yugioh_pack(p_pack_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 v_user uuid;
 v_pack public.yugioh_shop_packs%rowtype;
 v_balance bigint;
 v_cards bigint[]:=array[]::bigint[];
 v_card bigint;
 v_i integer;
 v_opening uuid;
 v_prev public.yugioh_pack_openings%rowtype;
begin
 v_user:=auth.uid();
 if v_user is null or p_request_id is null or p_pack_id is null then
   raise exception 'Sign in and provide a valid pack request' using errcode='42501';
 end if;

 select * into v_prev from public.yugioh_pack_openings
  where user_id=v_user and request_id=p_request_id;
 if found then
   if v_prev.pack_id<>p_pack_id then raise exception 'Request already used for a different pack'; end if;
   return pg_catalog.jsonb_build_object('opening_id',v_prev.id,'card_ids',v_prev.card_ids,
    'balance',v_prev.balance_after,'pack_name',v_prev.pack_name,'replayed',true);
 end if;

 select balance into v_balance from public.coin_wallets
  where user_id=v_user for update;
 if not found then raise exception 'Your Cartoon Coin wallet is unavailable'; end if;

 -- Recheck under wallet lock because another request may have just committed.
 select * into v_prev from public.yugioh_pack_openings
  where user_id=v_user and request_id=p_request_id;
 if found then
   if v_prev.pack_id<>p_pack_id then raise exception 'Request already used for a different pack'; end if;
   return pg_catalog.jsonb_build_object('opening_id',v_prev.id,'card_ids',v_prev.card_ids,
    'balance',v_prev.balance_after,'pack_name',v_prev.pack_name,'replayed',true);
 end if;

 select * into v_pack from public.yugioh_shop_packs
  where id=p_pack_id and is_active=true;
 if not found then raise exception 'This card pack is not available'; end if;
 if v_balance<v_pack.price_coins then raise exception 'Not enough Cartoon Coins'; end if;
 if (select count(*) from public.yugioh_shop_pack_cards where pack_id=v_pack.id)<v_pack.card_count then
   raise exception 'Pack contents are temporarily unavailable';
 end if;

 for v_i in 1..v_pack.card_count loop
   select pc.card_id into v_card from public.yugioh_shop_pack_cards pc
    where pc.pack_id=v_pack.id and not pc.card_id=any(v_cards)
    order by pg_catalog.random() limit 1;
   if v_card is null then raise exception 'Could not draw card'; end if;
   v_cards:=pg_catalog.array_append(v_cards,v_card);
 end loop;

 update public.coin_wallets set balance=balance-v_pack.price_coins,updated_at=now()
  where user_id=v_user returning balance into v_balance;
 insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
  values(v_user,-v_pack.price_coins,v_balance,'Yu-Gi-Oh! booster: '||v_pack.name,v_user);
 foreach v_card in array v_cards loop
   insert into public.yugioh_player_cards(user_id,card_id,quantity)
    values(v_user,v_card,1)
    on conflict(user_id,card_id) do update
      set quantity=public.yugioh_player_cards.quantity+1;
 end loop;
 insert into public.yugioh_pack_openings
  (user_id,request_id,pack_id,pack_name,price_coins,card_ids,balance_after)
  values(v_user,p_request_id,v_pack.id,v_pack.name,v_pack.price_coins,v_cards,v_balance)
  returning id into v_opening;

 return pg_catalog.jsonb_build_object('opening_id',v_opening,
  'card_ids',v_cards,'balance',v_balance,'pack_name',v_pack.name,'replayed',false);
end;
$function$;
revoke execute on function public.open_yugioh_pack(text,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.open_yugioh_pack(text,uuid) to authenticated;
comment on function public.open_yugioh_pack(text,uuid) is
 'Atomic wallet debit + five Yu-Gi-Oh card rewards; request idempotency. Never grants or modifies the fixed starter.';

comment on table public.yugioh_player_cards is
 'Owned Yu-Gi-Oh cards minted only by pack opening; NOT starter templates or reference deck lists.';
