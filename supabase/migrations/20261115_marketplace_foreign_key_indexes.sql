-- Cover the marketplace's foreign keys for efficient bidding, cleanup and transfers.
create index if not exists marketplace_auctions_ctoon_fk_idx on public.marketplace_auctions(ctoon_id) where ctoon_id is not null;
create index if not exists marketplace_auctions_card_fk_idx on public.marketplace_auctions(card_id) where card_id is not null;
create index if not exists marketplace_auctions_high_bidder_fk_idx on public.marketplace_auctions(highest_bidder_id) where highest_bidder_id is not null;
create index if not exists marketplace_bids_bidder_fk_idx on public.marketplace_bids(bidder_id);
notify pgrst, 'reload schema';