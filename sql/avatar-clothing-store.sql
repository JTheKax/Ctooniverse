-- Run in Supabase SQL editor before enabling purchases.
create table if not exists public.avatar_clothing_catalog (id text primary key,name text not null,category text not null,price_coins integer not null check(price_coins>=0),emoji text not null default '👕',is_for_sale boolean not null default true);
create table if not exists public.player_avatar_clothing (user_id uuid not null references auth.users(id) on delete cascade,item_id text not null references public.avatar_clothing_catalog(id),purchased_at timestamptz not null default now(),primary key(user_id,item_id));
alter table public.avatar_clothing_catalog enable row level security;
alter table public.player_avatar_clothing enable row level security;
create policy "Read available clothing" on public.avatar_clothing_catalog for select using (is_for_sale);
create policy "Read own wardrobe" on public.player_avatar_clothing for select to authenticated using (user_id=auth.uid());
insert into public.avatar_clothing_catalog(id,name,category,price_coins,emoji) values ('tee','Basic T-shirt','Tops',100,'👕'),('jeans','Classic Jeans','Pants',150,'👖'),('sneakers','Arcade Sneakers','Shoes',200,'👟'),('hoodie','Neon Hoodie','Tops',300,'🧥'),('jacket','Street Jacket','Tops',500,'🧥'),('outfit','Arcade Outfit','Outfits',1000,'🕺'),('legendary','Legendary Outfit','Outfits',5000,'✨') on conflict(id) do nothing;
-- SECURITY DEFINER purchase function: coin deduction and inventory insert are atomic.
create or replace function public.purchase_avatar_clothing(p_item_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();v_price integer;v_balance integer;
begin
 if v_user is null then raise exception 'Sign in required';end if;
 select price_coins into v_price from public.avatar_clothing_catalog where id=p_item_id and is_for_sale=true;
 if not found then raise exception 'Item unavailable';end if;
 if exists(select 1 from public.player_avatar_clothing where user_id=v_user and item_id=p_item_id) then raise exception 'Already owned';end if;
 update public.coin_wallets set balance=balance-v_price where user_id=v_user and balance>=v_price returning balance into v_balance;
 if not found then raise exception 'Insufficient coins';end if;
 insert into public.player_avatar_clothing(user_id,item_id) values(v_user,p_item_id);
 return jsonb_build_object('balance',v_balance);
end $$;
revoke all on function public.purchase_avatar_clothing(text) from public;
grant execute on function public.purchase_avatar_clothing(text) to authenticated;