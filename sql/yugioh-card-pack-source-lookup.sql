-- CTooniverse Yu-Gi-Oh! Card Database: public, read-only pack source lookup.
-- Players can see the ACTIVE packs that may contain a catalog card.
-- This never gives write access or grants cards to player collections.
create index if not exists yugioh_shop_pack_cards_card_pack_idx
  on public.yugioh_shop_pack_cards(card_id,pack_id);

alter table public.yugioh_shop_pack_cards enable row level security;

grant select (pack_id,card_id) on public.yugioh_shop_pack_cards to anon,authenticated;

drop policy if exists "Anyone can find active YuGiOh pack sources" on public.yugioh_shop_pack_cards;
create policy "Anyone can find active YuGiOh pack sources"
  on public.yugioh_shop_pack_cards
  for select to anon,authenticated
  using (
    exists(
      select 1 from public.yugioh_shop_packs as p
      where p.id = pack_id and p.is_active = true
    )
  );
