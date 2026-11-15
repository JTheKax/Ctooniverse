
-- CTooniverse Marketplace auctions: coins and items escrowed in Postgres
-- Only SECURITY DEFINER RPCs can mutate listings, bids, wallets or inventory.
create table if not exists public.marketplace_auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id),
  item_kind text not null check (item_kind in ('ctoon','yugioh')),
  ctoon_id uuid references public.ctoon_catalog(id),
  card_id bigint references public.yugioh_cards(card_id),
  starting_bid bigint not null check (starting_bid between 1 and 1000000000),
  current_bid bigint check (current_bid between 1 and 1000000000),
  highest_bidder_id uuid references auth.users(id),
  status text not null default 'active' check(status in ('active','settled','cancelled')),
  created_at timestamptz not null default now(),
  ends_at timestamptz not null,
  settled_at timestamptz,
  constraint marketplace_item_exactly_one check(
    (item_kind='ctoon' and ctoon_id is not null and card_id is null)
    or (item_kind='yugioh' and card_id is not null and ctoon_id is null)
  ),
  constraint marketplace_bid_state check (
    (current_bid is null and highest_bidder_id is null)
    or (current_bid is not null and highest_bidder_id is not null and current_bid >= starting_bid and highest_bidder_id <> seller_id)
  ),
  constraint marketplace_valid_duration check (ends_at > created_at)
);
create table if not exists public.marketplace_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.marketplace_auctions(id),
  bidder_id uuid not null references auth.users(id),
  amount bigint not null check(amount between 1 and 1000000000),
  created_at timestamptz not null default now()
);
create index if not exists marketplace_auctions_active_end_idx on public.marketplace_auctions(status, ends_at);
create index if not exists marketplace_auctions_seller_idx on public.marketplace_auctions(seller_id, created_at desc);
create index if not exists marketplace_bids_by_listing_idx on public.marketplace_bids(auction_id, created_at desc);
alter table public.marketplace_auctions enable row level security;
alter table public.marketplace_bids enable row level security;
revoke all on public.marketplace_auctions from public, anon, authenticated;
revoke all on public.marketplace_bids from public, anon, authenticated;
grant select on public.marketplace_auctions to anon, authenticated;
grant select on public.marketplace_bids to authenticated;
create policy marketplace_auctions_visible on public.marketplace_auctions for select to anon, authenticated
using(status in ('active','settled') or seller_id=(select auth.uid()) or highest_bidder_id=(select auth.uid()));
create policy marketplace_bids_participants on public.marketplace_bids for select to authenticated
using(bidder_id=(select auth.uid()) or exists(
  select 1 from public.marketplace_auctions a where a.id=auction_id and a.seller_id=(select auth.uid())
));

create or replace function public.marketplace_create_listing(
 p_item_kind text, p_ctoon_id uuid, p_card_id bigint, p_starting_bid bigint, p_duration_hours integer
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := auth.uid(); v_id uuid; v_quantity integer;
begin
 if v_me is null then raise exception 'Sign in to list collectibles'; end if;
 if p_item_kind not in ('ctoon','yugioh') or p_item_kind is null then raise exception 'Invalid collectible type'; end if;
 if p_starting_bid is null or p_starting_bid not between 1 and 1000000000 then raise exception 'Starting bid must be 1 to 1,000,000,000 coins'; end if;
 if p_duration_hours is null or p_duration_hours not in (1,6,12,24,48,72,168) then raise exception 'Invalid auction duration'; end if;
 if p_item_kind='ctoon' then
   if p_ctoon_id is null or p_card_id is not null or not exists(select 1 from public.ctoon_catalog where id=p_ctoon_id) then
     raise exception 'Invalid CToon'; end if;
   update public.player_ctoons set quantity=quantity-1
   where user_id=v_me and ctoon_id=p_ctoon_id and quantity>=1;
   if not found then raise exception 'You do not own an available copy of this CToon'; end if;
 else
   if p_card_id is null or p_ctoon_id is not null or not exists(select 1 from public.yugioh_cards where card_id=p_card_id and language_code='en') then
     raise exception 'Invalid collectible card'; end if;
   select quantity into v_quantity from public.yugioh_player_cards
   where user_id=v_me and card_id=p_card_id for update;
   if coalesce(v_quantity,0)<1 then raise exception 'You do not own an available copy of this card'; end if;
   if v_quantity=1 then
     delete from public.yugioh_player_cards where user_id=v_me and card_id=p_card_id;
   else
     update public.yugioh_player_cards set quantity=quantity-1 where user_id=v_me and card_id=p_card_id;
   end if;
 end if;
 insert into public.marketplace_auctions(seller_id,item_kind,ctoon_id,card_id,starting_bid,ends_at)
 values(v_me,p_item_kind,p_ctoon_id,p_card_id,p_starting_bid,clock_timestamp()+make_interval(hours=>p_duration_hours))
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.marketplace_place_bid(p_auction_id uuid,p_amount bigint)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := auth.uid(); v_listing public.marketplace_auctions%rowtype;
 v_balance bigint; v_refund_balance bigint; v_required bigint;
begin
 if v_me is null then raise exception 'Sign in to bid'; end if;
 if p_auction_id is null or p_amount is null or p_amount not between 1 and 1000000000 then raise exception 'Invalid bid'; end if;
 select * into v_listing from public.marketplace_auctions where id=p_auction_id for update;
 if not found or v_listing.status<>'active' then raise exception 'Auction unavailable'; end if;
 if v_listing.ends_at <= clock_timestamp() then raise exception 'This auction has ended'; end if;
 if v_listing.seller_id=v_me then raise exception 'You cannot bid on your own auction'; end if;
 if v_listing.highest_bidder_id=v_me then raise exception 'You already have the winning bid'; end if;
 v_required:=coalesce(v_listing.current_bid+1,v_listing.starting_bid);
 if p_amount<v_required then raise exception 'Bid must be at least % Cartoon Coins',v_required; end if;
 -- Escrow the entire new bid atomically; never trust a client-side coin amount.
 update public.coin_wallets
 set balance=balance-p_amount,updated_at=clock_timestamp()
 where user_id=v_me and balance>=p_amount returning balance into v_balance;
 if not found then raise exception 'Not enough Cartoon Coins'; end if;
 insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
 values(v_me,-p_amount,v_balance,'Auction bid escrow: '||p_auction_id::text,v_me);
 if v_listing.highest_bidder_id is not null then
   update public.coin_wallets
   set balance=balance+v_listing.current_bid,updated_at=clock_timestamp()
   where user_id=v_listing.highest_bidder_id returning balance into v_refund_balance;
   if not found then raise exception 'Cannot refund previous bidder; auction unchanged'; end if;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
   values(v_listing.highest_bidder_id,v_listing.current_bid,v_refund_balance,'Outbid refund: '||p_auction_id::text,v_me);
 end if;
 insert into public.marketplace_bids(auction_id,bidder_id,amount) values(p_auction_id,v_me,p_amount);
 update public.marketplace_auctions set current_bid=p_amount,highest_bidder_id=v_me where id=p_auction_id;
 return jsonb_build_object('auction_id',p_auction_id,'current_bid',p_amount,'balance',v_balance);
end $$;

create or replace function public.marketplace_cancel_listing(p_auction_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_me uuid := auth.uid(); v_listing public.marketplace_auctions%rowtype;
begin
 if v_me is null then raise exception 'Sign in to cancel'; end if;
 select * into v_listing from public.marketplace_auctions where id=p_auction_id for update;
 if not found or v_listing.status<>'active' or v_listing.seller_id<>v_me then
   raise exception 'This listing cannot be cancelled'; end if;
 if v_listing.highest_bidder_id is not null then
   raise exception 'Cannot cancel after bidding starts'; end if;
 if v_listing.item_kind='ctoon' then
   insert into public.player_ctoons(user_id,ctoon_id,quantity) values(v_me,v_listing.ctoon_id,1)
   on conflict(user_id,ctoon_id) do update set quantity=public.player_ctoons.quantity+1;
 else
   insert into public.yugioh_player_cards(user_id,card_id,quantity) values(v_me,v_listing.card_id,1)
   on conflict(user_id,card_id) do update set quantity=public.yugioh_player_cards.quantity+1;
 end if;
 update public.marketplace_auctions set status='cancelled',settled_at=clock_timestamp() where id=p_auction_id;
 return p_auction_id;
end $$;

-- Safe to retry: SKIP LOCKED plus active->settled transition prevents duplicate payouts.
-- Can run from a signed-in UI refresh or from a scheduled database cron job.
create or replace function public.marketplace_settle_expired(p_limit integer default 50)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_listing public.marketplace_auctions%rowtype; v_count integer:=0; v_balance bigint; v_recipient uuid;
begin
 if auth.uid() is null and session_user not in ('postgres','supabase_admin') then
   raise exception 'Authentication required'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid settlement batch size'; end if;
 for v_listing in
   select * from public.marketplace_auctions
   where status='active' and ends_at<=clock_timestamp()
   order by ends_at
   limit p_limit
   for update skip locked
 loop
   v_recipient:=coalesce(v_listing.highest_bidder_id,v_listing.seller_id);
   if v_listing.item_kind='ctoon' then
     insert into public.player_ctoons(user_id,ctoon_id,quantity) values(v_recipient,v_listing.ctoon_id,1)
     on conflict(user_id,ctoon_id) do update set quantity=public.player_ctoons.quantity+1;
   else
     insert into public.yugioh_player_cards(user_id,card_id,quantity) values(v_recipient,v_listing.card_id,1)
     on conflict(user_id,card_id) do update set quantity=public.yugioh_player_cards.quantity+1;
   end if;
   if v_listing.highest_bidder_id is not null then
     update public.coin_wallets
     set balance=balance+v_listing.current_bid,updated_at=clock_timestamp()
     where user_id=v_listing.seller_id returning balance into v_balance;
     if not found then raise exception 'Seller wallet unavailable, settlement aborted'; end if;
     insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
     values(v_listing.seller_id,v_listing.current_bid,v_balance,
            'Auction sale payout: '||v_listing.id::text,v_listing.highest_bidder_id);
   end if;
   update public.marketplace_auctions set status='settled',settled_at=clock_timestamp() where id=v_listing.id;
   v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function public.marketplace_create_listing(text,uuid,bigint,bigint,integer) from public,anon,authenticated;
revoke all on function public.marketplace_place_bid(uuid,bigint) from public,anon,authenticated;
revoke all on function public.marketplace_cancel_listing(uuid) from public,anon,authenticated;
revoke all on function public.marketplace_settle_expired(integer) from public,anon,authenticated;
grant execute on function public.marketplace_create_listing(text,uuid,bigint,bigint,integer) to authenticated;
grant execute on function public.marketplace_place_bid(uuid,bigint) to authenticated;
grant execute on function public.marketplace_cancel_listing(uuid) to authenticated;
grant execute on function public.marketplace_settle_expired(integer) to authenticated;
