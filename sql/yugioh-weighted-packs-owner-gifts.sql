-- CTooniverse Yu-Gi-Oh! pack odds and owner gifting.
-- Odds are per-card relative weights, not fixed slot guarantees.
-- Boosters remain random even when a pack has only rare cards.

create table if not exists public.yugioh_card_pull_weights (
 card_id bigint primary key references public.yugioh_cards(card_id) on delete cascade,
 tier text not null check (tier in ('Common','Uncommon','Rare','Epic','Legendary')),
 pull_weight integer not null check (pull_weight between 1 and 100),
 updated_at timestamptz not null default now()
);
alter table public.yugioh_card_pull_weights enable row level security;
revoke all on public.yugioh_card_pull_weights from PUBLIC,anon,authenticated;
grant select on public.yugioh_card_pull_weights to anon,authenticated;
drop policy if exists "View YuGiOh pull tiers" on public.yugioh_card_pull_weights;
create policy "View YuGiOh pull tiers" on public.yugioh_card_pull_weights
 for select to anon,authenticated using (true);

-- These are IN-GAME rarity tiers, derived from the English catalog's
-- sample printed rarity, power stats and TCG restricted status. Official
-- card printing rarities do not imply a unique rarity for a card name.
create or replace function public.yugioh_calculate_pull_tier(p_card public.yugioh_cards)
returns text
language sql immutable set search_path=''
as $tier$
select case
 when p_card.card_type in ('Token','Skill Card') then 'Common'
 when p_card.name in (
  'Blue-Eyes White Dragon','Dark Magician','Red-Eyes Black Dragon',
  'Exodia the Forbidden One','The Winged Dragon of Ra',
  'Obelisk the Tormentor','Slifer the Sky Dragon',
  'Stardust Dragon','Number 39: Utopia','Elemental HERO Neos',
  'Blue-Eyes Ultimate Dragon'
 ) or p_card.card_data->'banlist_info'->>'ban_tcg'='Forbidden'
   or coalesce(p_card.card_data->'card_sets'->0->>'set_rarity','') ~* 
      '(Starlight|Ghost Rare|Quarter Century Secret|10000 Secret)'
 then 'Legendary'
 when coalesce(p_card.attack,0)>=3000 or coalesce(p_card.level,0)>=10
   or p_card.card_data->'banlist_info'->>'ban_tcg'='Limited'
   or coalesce(p_card.card_data->'card_sets'->0->>'set_rarity','') ~*
     '(Ultra Rare|Secret Rare|Ultimate Rare|Collector.s Rare|Prismatic|Platinum|Gold Secret)'
 then 'Epic'
 when coalesce(p_card.attack,0)>=2500 or coalesce(p_card.level,0)>=8
   or coalesce(p_card.card_data->'card_sets'->0->>'set_rarity','') ~* 
     '(^Rare$|Super Rare|Gold Rare|Grand Master Rare)'
 then 'Rare'
 when coalesce(p_card.attack,0)>=1800 or coalesce(p_card.level,0)>=5
   or coalesce(p_card.card_data->'card_sets'->0->>'set_rarity','') ~*
     '(Short Print|Parallel Rare|Starfoil Rare|Mosaic Rare|Shatterfoil Rare)'
   or p_card.card_type ilike '%Fusion%'
   or p_card.card_type ilike '%Synchro%'
   or p_card.card_type ilike '%XYZ%'
   or p_card.card_type ilike '%Link Monster%'
 then 'Uncommon'
 else 'Common'
end;
$tier$;

-- Backfill existing entries. Index makes lookups fast for every pack opening.
insert into public.yugioh_card_pull_weights (card_id,tier,pull_weight)
select c.card_id, t.tier,
 case t.tier
  when 'Common' then 80 when 'Uncommon' then 35
  when 'Rare' then 12 when 'Epic' then 3 else 1 end
from public.yugioh_cards c
cross join lateral (select public.yugioh_calculate_pull_tier(c) tier) t
on conflict (card_id) do update
 set tier=excluded.tier,pull_weight=excluded.pull_weight,updated_at=now();

-- Future catalog imports automatically recompute odds on card changes.
create or replace function public.yugioh_sync_pull_weight()
returns trigger language plpgsql set search_path=''
as $sync$
declare v_tier text;
begin
 v_tier:=public.yugioh_calculate_pull_tier(new);
 insert into public.yugioh_card_pull_weights(card_id,tier,pull_weight)
 values(new.card_id,v_tier,
   case v_tier when 'Common' then 80 when 'Uncommon' then 35
               when 'Rare' then 12 when 'Epic' then 3 else 1 end)
 on conflict(card_id) do update set tier=excluded.tier,
   pull_weight=excluded.pull_weight,updated_at=now();
 return new;
end;
$sync$;
drop trigger if exists yugioh_card_pull_weight_sync on public.yugioh_cards;
create trigger yugioh_card_pull_weight_sync
 after insert or update of name,card_type,card_data,attack,level
 on public.yugioh_cards for each row
 execute function public.yugioh_sync_pull_weight();

-- Replace old uniform random() selection while preserving transactions,
-- no-repeat-within-a-pack, wallet locking and idempotent request IDs.
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
   -- Weighted random sampling WITHOUT replacement. Generate fresh
   -- cryptographic entropy per eligible card on EVERY draw (no prechosen
   -- sequences, no fixed rare slot, and no browser-supplied outcomes).
   -- Exponential race: each card's chance is proportional to its weight.
   select pool.card_id into v_card
   from (
     select pc.card_id,
            coalesce(w.pull_weight,80)::numeric as weight,
            extensions.gen_random_bytes(4) as entropy
     from public.yugioh_shop_pack_cards pc
     left join public.yugioh_card_pull_weights w on w.card_id=pc.card_id
     where pc.pack_id=v_pack.id and not pc.card_id=any(v_cards)
   ) pool
   order by (
     -pg_catalog.ln(
       (pg_catalog.get_byte(pool.entropy,0)::numeric*16777216
       +pg_catalog.get_byte(pool.entropy,1)::numeric*65536
       +pg_catalog.get_byte(pool.entropy,2)::numeric*256
       +pg_catalog.get_byte(pool.entropy,3)::numeric+1
       ) / 4294967297::numeric
     ) / pool.weight
   ) asc, pool.card_id asc
   limit 1;
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

-- Immutable audit history for all owner-issued card rewards.
create table if not exists public.yugioh_owner_card_grants (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 recipient_name text not null,
 card_id bigint not null references public.yugioh_cards(card_id),
 quantity integer not null check (quantity between 1 and 100),
 reason text not null check (char_length(reason) between 3 and 200),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(owner_id,request_id)
);
create index if not exists yugioh_owner_grants_owner_recent
 on public.yugioh_owner_card_grants(owner_id,created_at desc);
alter table public.yugioh_owner_card_grants enable row level security;
revoke all on public.yugioh_owner_card_grants from PUBLIC,anon,authenticated;
grant select on public.yugioh_owner_card_grants to authenticated;
drop policy if exists "Only owners read YuGiOh gifting audit" on public.yugioh_owner_card_grants;
create policy "Only owners read YuGiOh gifting audit"
 on public.yugioh_owner_card_grants for select to authenticated
 using (
  (select auth.uid())=owner_id and exists (
   select 1 from public.site_owners o where o.user_id=(select auth.uid())
  )
 );

create or replace function public.owner_give_yugioh_card(
 p_username text,p_card_id bigint,p_quantity integer,p_reason text,p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $gift$
declare
 v_owner uuid:=auth.uid();
 v_target uuid;
 v_name text;
 v_matches bigint;
 v_card_name text;
 v_grant_id uuid;
 v_new_quantity integer;
 v_previous public.yugioh_owner_card_grants%rowtype;
begin
 if v_owner is null or not exists(
  select 1 from public.site_owners where user_id=v_owner
 ) then
   raise exception 'Verified site owner required' using errcode='42501';
 end if;
 if p_request_id is null or p_card_id is null or p_quantity not between 1 and 100
   or p_username is null or pg_catalog.char_length(pg_catalog.btrim(p_username)) not between 3 and 30
   or p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 3 and 200
 then
   raise exception 'Provide an exact username, card, 1–100 copies, and a reason of 3–200 characters';
 end if;

 select count(*),min(u.id),min(u.raw_user_meta_data->>'display_name')
 into v_matches,v_target,v_name
 from auth.users u
 where pg_catalog.lower(pg_catalog.btrim(u.raw_user_meta_data->>'display_name'))=
       pg_catalog.lower(pg_catalog.btrim(p_username));
 if v_matches=0 then raise exception 'Player username not found'; end if;
 if v_matches<>1 then raise exception 'Username is not unique; cannot safely issue cards'; end if;

 select c.name into v_card_name from public.yugioh_cards c
 where c.card_id=p_card_id and c.language_code='en';
 if v_card_name is null then raise exception 'Card not found in English catalog'; end if;

 select * into v_previous from public.yugioh_owner_card_grants
 where owner_id=v_owner and request_id=p_request_id;
 if found then
  if v_previous.recipient_id<>v_target or v_previous.card_id<>p_card_id
     or v_previous.quantity<>p_quantity or v_previous.reason<>pg_catalog.btrim(p_reason)
  then
   raise exception 'Request ID already used for another card grant';
  end if;
  return pg_catalog.jsonb_build_object('grant_id',v_previous.id,
   'player_name',v_previous.recipient_name,'card_name',v_card_name,
   'quantity_added',v_previous.quantity,'replayed',true);
 end if;

 insert into public.yugioh_owner_card_grants
 (owner_id,recipient_id,recipient_name,card_id,quantity,reason,request_id)
 values(v_owner,v_target,v_name,p_card_id,p_quantity,pg_catalog.btrim(p_reason),p_request_id)
 on conflict(owner_id,request_id) do nothing
 returning id into v_grant_id;
 if v_grant_id is null then
  select * into v_previous from public.yugioh_owner_card_grants
  where owner_id=v_owner and request_id=p_request_id;
  if not found or v_previous.recipient_id<>v_target or v_previous.card_id<>p_card_id
     or v_previous.quantity<>p_quantity or v_previous.reason<>pg_catalog.btrim(p_reason)
  then
   raise exception 'Request ID already used for another card grant';
  end if;
  return pg_catalog.jsonb_build_object('grant_id',v_previous.id,
   'player_name',v_previous.recipient_name,'card_name',v_card_name,
   'quantity_added',v_previous.quantity,'replayed',true);
 end if;

 insert into public.yugioh_player_cards(user_id,card_id,quantity)
 values(v_target,p_card_id,p_quantity)
 on conflict(user_id,card_id) do update
  set quantity=public.yugioh_player_cards.quantity+excluded.quantity
 returning quantity into v_new_quantity;

 return pg_catalog.jsonb_build_object(
  'grant_id',v_grant_id,'player_name',v_name,'card_name',v_card_name,
  'quantity_added',p_quantity,'total_owned',v_new_quantity,'replayed',false
 );
end;
$gift$;
revoke execute on function public.owner_give_yugioh_card(text,bigint,integer,text,uuid)
 from PUBLIC,anon,authenticated;
grant execute on function public.owner_give_yugioh_card(text,bigint,integer,text,uuid)
 to authenticated;
comment on function public.owner_give_yugioh_card(text,bigint,integer,text,uuid) is
 'Verified owner-only audited card reward. Idempotent, no coin charge; never modifies starter loaners.';
