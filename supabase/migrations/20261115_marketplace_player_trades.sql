-- Player-to-player trades, separate CToons and Yu-Gi-Oh! card categories.
-- Assets are checked on creation and rechecked atomically at acceptance.
-- No direct user writes: every transition goes through validated RPCs.

create table if not exists public.marketplace_trades (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  item_kind text not null check (item_kind in ('ctoon','yugioh')),
  offer_ctoon_id uuid references public.ctoon_catalog(id),
  offer_card_id bigint references public.yugioh_cards(card_id),
  offer_qty integer not null default 0 check (offer_qty between 0 and 1000),
  offer_coins bigint not null default 0 check (offer_coins between 0 and 1000000000),
  request_ctoon_id uuid references public.ctoon_catalog(id),
  request_card_id bigint references public.yugioh_cards(card_id),
  request_qty integer not null default 0 check (request_qty between 0 and 1000),
  request_coins bigint not null default 0 check (request_coins between 0 and 1000000000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint marketplace_trade_two_players check (sender_id<>recipient_id),
  constraint marketplace_trade_both_sides check ((offer_qty>0 or offer_coins>0) and (request_qty>0 or request_coins>0)),
  constraint marketplace_trade_offer_type check (
    (offer_qty=0 and offer_ctoon_id is null and offer_card_id is null)
    or (offer_qty>0 and (
       (item_kind='ctoon' and offer_ctoon_id is not null and offer_card_id is null)
       or (item_kind='yugioh' and offer_card_id is not null and offer_ctoon_id is null)
    ))
  ),
  constraint marketplace_trade_request_type check (
    (request_qty=0 and request_ctoon_id is null and request_card_id is null)
    or (request_qty>0 and (
       (item_kind='ctoon' and request_ctoon_id is not null and request_card_id is null)
       or (item_kind='yugioh' and request_card_id is not null and request_ctoon_id is null)
    ))
  )
);
create index if not exists marketplace_trades_recipient_idx on public.marketplace_trades(recipient_id,created_at desc);
create index if not exists marketplace_trades_sender_idx on public.marketplace_trades(sender_id,created_at desc);
alter table public.marketplace_trades enable row level security;
revoke all on public.marketplace_trades from public,anon,authenticated;
grant select on public.marketplace_trades to authenticated;
drop policy if exists marketplace_trades_participants_read on public.marketplace_trades;
create policy marketplace_trades_participants_read on public.marketplace_trades for select to authenticated
using (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

create or replace function public.marketplace_trade_participant_names()
returns table(player_id uuid, player_name text)
language sql stable security definer set search_path=''
as $$
 select u.id,coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'),''),'Player')
 from auth.users u
 where auth.uid() is not null
 and (u.id=auth.uid() or exists(
   select 1 from public.marketplace_trades t
   where (t.sender_id=auth.uid() or t.recipient_id=auth.uid())
   and u.id in (t.sender_id,t.recipient_id)
 ));
$$;

create or replace function public.marketplace_trade_create(
 p_recipient uuid, p_kind text, p_offer_ctoon uuid default null, p_offer_card bigint default null,
 p_offer_qty integer default 0, p_offer_coins bigint default 0,
 p_request_ctoon uuid default null, p_request_card bigint default null,
 p_request_qty integer default 0, p_request_coins bigint default 0
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_me uuid:=auth.uid(); v_trade uuid;
begin
 if v_me is null then raise exception 'Sign in to trade'; end if;
 if p_recipient is null or p_recipient=v_me or not exists(select 1 from auth.users where id=p_recipient) then
   raise exception 'Choose another registered player'; end if;
 if p_kind is null or p_kind not in ('ctoon','yugioh') then raise exception 'Invalid trade category'; end if;
 if p_offer_qty is null or p_request_qty is null
 or p_offer_coins is null or p_request_coins is null
 or p_offer_qty not between 0 and 1000 or p_request_qty not between 0 and 1000
 or p_offer_coins not between 0 and 1000000000 or p_request_coins not between 0 and 1000000000 then
   raise exception 'Invalid trade quantities'; end if;
 if (p_offer_qty=0 and p_offer_coins=0) or (p_request_qty=0 and p_request_coins=0) then
   raise exception 'Both players must offer an item or coins'; end if;
 if (p_offer_qty=0 and (p_offer_ctoon is not null or p_offer_card is not null))
 or (p_request_qty=0 and (p_request_ctoon is not null or p_request_card is not null)) then
   raise exception 'Set an item quantity to trade it'; end if;
 if p_kind='ctoon' then
   if p_offer_card is not null or p_request_card is not null
      or (p_offer_qty>0 and p_offer_ctoon is null)
      or (p_request_qty>0 and p_request_ctoon is null) then raise exception 'Choose valid CToons'; end if;
   if p_offer_qty>0 and not exists(select 1 from public.ctoon_catalog where id=p_offer_ctoon) then raise exception 'CToon not found'; end if;
   if p_request_qty>0 and not exists(select 1 from public.ctoon_catalog where id=p_request_ctoon) then raise exception 'Requested CToon not found'; end if;
   if p_offer_qty>0 and coalesce((select quantity from public.player_ctoons where user_id=v_me and ctoon_id=p_offer_ctoon),0)<p_offer_qty then
     raise exception 'You do not have enough available copies of that CToon'; end if;
   if p_request_qty>0 and coalesce((select quantity from public.player_ctoons where user_id=p_recipient and ctoon_id=p_request_ctoon),0)<p_request_qty then
     raise exception 'Recipient does not have enough available copies of that CToon'; end if;
 else
   if p_offer_ctoon is not null or p_request_ctoon is not null
      or (p_offer_qty>0 and p_offer_card is null)
      or (p_request_qty>0 and p_request_card is null) then raise exception 'Choose valid Yu-Gi-Oh! cards'; end if;
   if p_offer_qty>0 and not exists(select 1 from public.yugioh_cards where card_id=p_offer_card and language_code='en') then raise exception 'Card not found'; end if;
   if p_request_qty>0 and not exists(select 1 from public.yugioh_cards where card_id=p_request_card and language_code='en') then raise exception 'Requested card not found'; end if;
   if p_offer_qty>0 and coalesce((select quantity from public.yugioh_player_cards where user_id=v_me and card_id=p_offer_card),0)<p_offer_qty then
     raise exception 'You do not have enough available copies of that card'; end if;
   if p_request_qty>0 and coalesce((select quantity from public.yugioh_player_cards where user_id=p_recipient and card_id=p_request_card),0)<p_request_qty then
     raise exception 'Recipient does not own enough copies of that card'; end if;
 end if;
 if p_offer_coins>0 and coalesce((select balance from public.coin_wallets where user_id=v_me),0)<p_offer_coins then
   raise exception 'You do not have enough Cartoon Coins'; end if;
 if p_request_coins>0 and coalesce((select balance from public.coin_wallets where user_id=p_recipient),0)<p_request_coins then
   raise exception 'Recipient does not have enough Cartoon Coins'; end if;
 insert into public.marketplace_trades(
   sender_id,recipient_id,item_kind,offer_ctoon_id,offer_card_id,offer_qty,offer_coins,
   request_ctoon_id,request_card_id,request_qty,request_coins
 ) values (
   v_me,p_recipient,p_kind,p_offer_ctoon,p_offer_card,p_offer_qty,p_offer_coins,
   p_request_ctoon,p_request_card,p_request_qty,p_request_coins
 ) returning id into v_trade;
 return v_trade;
end $$;

create or replace function public.marketplace_trade_action(p_trade_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
 t public.marketplace_trades%rowtype;
 v_me uuid:=auth.uid();
 v_sender_coins bigint; v_recipient_coins bigint; v_balance bigint;
begin
 if v_me is null then raise exception 'Sign in to respond'; end if;
 if p_trade_id is null or p_action is null or p_action not in ('accept','decline','cancel') then
   raise exception 'Invalid trade action'; end if;
 select * into t from public.marketplace_trades where id=p_trade_id for update;
 if not found or t.status<>'pending' then raise exception 'Trade is no longer pending'; end if;
 if p_action='cancel' then
   if v_me<>t.sender_id then raise exception 'Only the sender can cancel'; end if;
 else
   if v_me<>t.recipient_id then raise exception 'Only the recipient can respond'; end if;
 end if;
 if p_action<>'accept' then
   update public.marketplace_trades
   set status=case when p_action='cancel' then 'cancelled' else 'declined' end,completed_at=clock_timestamp()
   where id=t.id;
   return t.id;
 end if;

 -- Serialize simultaneous trades sharing a player, with a deterministic lock order.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(t.sender_id::text,t.recipient_id::text),716));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(greatest(t.sender_id::text,t.recipient_id::text),716));
 if t.offer_coins>0 or t.request_coins>0 then
   -- Lock both wallet rows before checking either balance.
   perform 1 from public.coin_wallets where user_id in (t.sender_id,t.recipient_id) order by user_id for update;
   select balance into v_sender_coins from public.coin_wallets where user_id=t.sender_id;
   select balance into v_recipient_coins from public.coin_wallets where user_id=t.recipient_id;
   if coalesce(v_sender_coins,0)<t.offer_coins or coalesce(v_recipient_coins,0)<t.request_coins then
     raise exception 'One player no longer has the required Cartoon Coins'; end if;
 end if;
 -- No assets are escrowed when sending an offer. These conditional updates
 -- prevent duplicates/negative inventory even if an auction happened meanwhile.
 if t.offer_qty>0 then
   if t.item_kind='ctoon' then
     update public.player_ctoons set quantity=quantity-t.offer_qty
       where user_id=t.sender_id and ctoon_id=t.offer_ctoon_id and quantity>=t.offer_qty;
     if not found then raise exception 'Sender no longer has the offered CToons'; end if;
   else
     update public.yugioh_player_cards set quantity=quantity-t.offer_qty
       where user_id=t.sender_id and card_id=t.offer_card_id and quantity>=t.offer_qty;
     if not found then raise exception 'Sender no longer has the offered cards'; end if;
   end if;
 end if;
 if t.request_qty>0 then
   if t.item_kind='ctoon' then
     update public.player_ctoons set quantity=quantity-t.request_qty
       where user_id=t.recipient_id and ctoon_id=t.request_ctoon_id and quantity>=t.request_qty;
     if not found then raise exception 'You no longer have the requested CToons'; end if;
   else
     update public.yugioh_player_cards set quantity=quantity-t.request_qty
       where user_id=t.recipient_id and card_id=t.request_card_id and quantity>=t.request_qty;
     if not found then raise exception 'You no longer have the requested cards'; end if;
   end if;
 end if;
 -- Deduct both sides before granting either side coin credits.
 if t.offer_coins>0 then
   update public.coin_wallets set balance=balance-t.offer_coins,updated_at=clock_timestamp()
     where user_id=t.sender_id and balance>=t.offer_coins returning balance into v_balance;
   if not found then raise exception 'Sender no longer has the required coins'; end if;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
    values(t.sender_id,-t.offer_coins,v_balance,'Trade payment: '||t.id::text,v_me);
 end if;
 if t.request_coins>0 then
   update public.coin_wallets set balance=balance-t.request_coins,updated_at=clock_timestamp()
     where user_id=t.recipient_id and balance>=t.request_coins returning balance into v_balance;
   if not found then raise exception 'Recipient no longer has the required coins'; end if;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
    values(t.recipient_id,-t.request_coins,v_balance,'Trade payment: '||t.id::text,v_me);
 end if;
 if t.offer_qty>0 then
   if t.item_kind='ctoon' then
     insert into public.player_ctoons(user_id,ctoon_id,quantity) values(t.recipient_id,t.offer_ctoon_id,t.offer_qty)
       on conflict(user_id,ctoon_id) do update set quantity=public.player_ctoons.quantity+excluded.quantity;
   else
     insert into public.yugioh_player_cards(user_id,card_id,quantity) values(t.recipient_id,t.offer_card_id,t.offer_qty)
       on conflict(user_id,card_id) do update set quantity=public.yugioh_player_cards.quantity+excluded.quantity;
   end if;
 end if;
 if t.request_qty>0 then
   if t.item_kind='ctoon' then
     insert into public.player_ctoons(user_id,ctoon_id,quantity) values(t.sender_id,t.request_ctoon_id,t.request_qty)
       on conflict(user_id,ctoon_id) do update set quantity=public.player_ctoons.quantity+excluded.quantity;
   else
     insert into public.yugioh_player_cards(user_id,card_id,quantity) values(t.sender_id,t.request_card_id,t.request_qty)
       on conflict(user_id,card_id) do update set quantity=public.yugioh_player_cards.quantity+excluded.quantity;
   end if;
 end if;
 if t.offer_coins>0 then
   update public.coin_wallets set balance=balance+t.offer_coins,updated_at=clock_timestamp()
     where user_id=t.recipient_id returning balance into v_balance;
   if not found then raise exception 'Recipient wallet unavailable'; end if;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
    values(t.recipient_id,t.offer_coins,v_balance,'Trade receipt: '||t.id::text,v_me);
 end if;
 if t.request_coins>0 then
   update public.coin_wallets set balance=balance+t.request_coins,updated_at=clock_timestamp()
     where user_id=t.sender_id returning balance into v_balance;
   if not found then raise exception 'Sender wallet unavailable'; end if;
   insert into public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
    values(t.sender_id,t.request_coins,v_balance,'Trade receipt: '||t.id::text,v_me);
 end if;
 update public.marketplace_trades set status='accepted',completed_at=clock_timestamp() where id=t.id;
 return t.id;
end $$;

revoke all on function public.marketplace_trade_create(uuid,text,uuid,bigint,integer,bigint,uuid,bigint,integer,bigint) from public,anon,authenticated;
revoke all on function public.marketplace_trade_action(uuid,text) from public,anon,authenticated;
revoke all on function public.marketplace_trade_participant_names() from public,anon,authenticated;
grant execute on function public.marketplace_trade_create(uuid,text,uuid,bigint,integer,bigint,uuid,bigint,integer,bigint) to authenticated;
grant execute on function public.marketplace_trade_action(uuid,text) to authenticated;
grant execute on function public.marketplace_trade_participant_names() to authenticated;
