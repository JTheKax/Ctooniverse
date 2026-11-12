-- The live Supabase migration was applied as ctoon_claw_craze_game.
-- This file captures the same schema and database-controlled reward function.
-- 100 coins per play, 55% win odds, 200 coins for the coin capsule.
create table if not exists public.claw_machine_plays (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 target_slot smallint not null check (target_slot between 0 and 6),
 won boolean not null,
 prize_key text,
 coin_award integer not null default 0 check (coin_award >= 0),
 balance_after bigint not null check (balance_after >= 0),
 created_at timestamptz not null default now(),
 primary key (user_id,request_id)
);
create index if not exists claw_machine_plays_recent_idx on public.claw_machine_plays(user_id,created_at desc);
create table if not exists public.claw_machine_collection (
 user_id uuid not null references auth.users(id) on delete cascade,
 prize_key text not null check(prize_key in ('space_bear','star_bunny','neon_fox','arcade_axolotl','cosmic_cat','robo_dino')),
 quantity integer not null default 0 check(quantity >= 0),
 primary key(user_id,prize_key)
);
alter table public.claw_machine_plays enable row level security;
alter table public.claw_machine_collection enable row level security;
drop policy if exists "Claw plays are private" on public.claw_machine_plays;
create policy "Claw plays are private" on public.claw_machine_plays for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Claw collection is private" on public.claw_machine_collection;
create policy "Claw collection is private" on public.claw_machine_collection for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.claw_machine_plays,public.claw_machine_collection from anon,authenticated;
grant select on table public.claw_machine_plays,public.claw_machine_collection to authenticated;

CREATE OR REPLACE FUNCTION public.play_claw_machine(p_request_id uuid, p_target smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_old public.claw_machine_plays%rowtype;
 v_balance bigint;
 v_won boolean;
 v_key text;
 v_award integer := 0;
 v_cost constant integer := 100;
 v_keys text[] := array['space_bear','star_bunny','neon_fox','arcade_axolotl','cosmic_cat','robo_dino','coin_capsule'];
begin
 if v_uid is null then
  raise exception 'Sign in to play Claw Craze' using errcode='42501';
 end if;
 if p_request_id is null or p_target is null or p_target < 0 or p_target > 6 then
  raise exception 'Invalid claw play request';
 end if;
 -- Same player, same request can never debit twice, even during parallel requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,974103));
 select * into v_old from public.claw_machine_plays
 where user_id=v_uid and request_id=p_request_id;
 if found then
  return pg_catalog.jsonb_build_object('won',v_old.won,'target_slot',v_old.target_slot,
   'prize_key',v_old.prize_key,'coin_award',v_old.coin_award,
   'balance',v_old.balance_after,'already_recorded',true,'cost',v_cost);
 end if;
 update public.coin_wallets
 set balance=balance-v_cost,updated_at=now()
 where user_id=v_uid and balance>=v_cost returning balance into v_balance;
 if v_balance is null then
  raise exception 'Not enough Cartoon Coins, or wallet unavailable';
 end if;
 insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
 values(v_uid,-v_cost,v_balance,'Claw Craze play',v_uid);
 -- A real arcade grip-chance game: the player chooses the toy;
 -- the database decides if the claw holds it. No client-supplied win flag.
 v_won := pg_catalog.random() < 0.55;
 if v_won then
  v_key := v_keys[p_target+1];
  if p_target=6 then
   v_award := 200;
   update public.coin_wallets set balance=balance+v_award,updated_at=now()
   where user_id=v_uid returning balance into v_balance;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
   values(v_uid,v_award,v_balance,'Claw Craze: coin capsule',v_uid);
  else
   insert into public.claw_machine_collection(user_id,prize_key,quantity)
   values(v_uid,v_key,1)
   on conflict(user_id,prize_key) do update
   set quantity=public.claw_machine_collection.quantity+1;
  end if;
 end if;
 insert into public.claw_machine_plays(user_id,request_id,target_slot,won,prize_key,coin_award,balance_after)
 values(v_uid,p_request_id,p_target,v_won,v_key,v_award,v_balance);
 return pg_catalog.jsonb_build_object('won',v_won,'target_slot',p_target,
  'prize_key',v_key,'coin_award',v_award,'balance',v_balance,
  'already_recorded',false,'cost',v_cost);
end
$function$

revoke all on function public.play_claw_machine(uuid,smallint) from public,anon;
grant execute on function public.play_claw_machine(uuid,smallint) to authenticated;
