# Yu-Gi-Oh! Card Shop — 41 Booster Packs

The CTooniverse Card Shop is at `yugioh-card-shop.html`, with navigation under **Shop → Yu-Gi-Oh! Card Shop**.

## Packs and eligibility

- **41 active packs**, comprising the original 4 and 37 new boosters.
- **Featured**: 1 pack.
- **Legendary Series**: 7 packs (Toon, Blue-Eyes, Red-Eyes, Dark Magician, HERO, Galaxy, Blackwing).
- **Monster Realms**: 12 packs (Dragon, Spellcaster, Warrior, Machine, Fiend, Zombie, Beast families, Ocean, Dinosaur families, Insect & Plant, Cyberse, Fairy & Psychic).
- **Elemental Forces**: 6 packs (DARK, LIGHT, EARTH, WATER, FIRE, WIND).
- **Duel Mechanics**: 7 packs (Spells, Traps, Fusion, Synchro, Xyz, Link, Pendulum & Ritual).
- **Card Archives**: 8 volumes; each English card is assigned to **exactly one** archive via `mod(card_id,8)`. These eight archives guarantee that the current entire English database is collectible.

All packs draw **5 distinct random cards**, with no guaranteed official rarity ratios. Prices are **250–550 Cartoon Coins** (fictional in-game currency). Cards can recur in separate packs and increase the player's quantity.

**Important:** The archives contain all 14,681 English cards present on November 15, 2026, including 124 Skill Cards and 106 Tokens. These are collectible but not usable in the current Deck Builder or simplified Duel Arena. Classic starter decks are unchanged and remain fixed Arena-only loaners; no starter cards are granted to personal inventories.

## Data design

- `public.yugioh_shop_packs`: active packs, theme/category, price, per-pack card count, computed `pool_size`, sort order and cover image card ID.
- `public.yugioh_shop_pack_cards`: the private pack-to-card candidate mapping. Players cannot alter these mappings.
- `public.open_yugioh_pack(text,uuid)`: authenticated server-side atomic coin checkout and random draws, with replay-safe request IDs.
- `public.yugioh_player_cards`: owned collection; only cards pulled from packs enter the collection.
- `public.yugioh_pack_openings`: pack-opening audit history.

The shop UI supports category filtering, pack-name searching and accurate candidate counts. Cover images use mapped `art_image_id` from the existing English card catalog.

## Maintenance and new imports

The source of truth for the additional booster definitions and their selection rules is:
`sql/yugioh-expanded-booster-packs.sql`.

**After importing additional Yu-Gi-Oh! catalog cards**, rerun the expansion SQL against the same Supabase project. It only inserts eligible candidate rows with `ON CONFLICT DO NOTHING` and recalculates pool counts. Existing player collections, pack-opening history and permanent Arena starter choices are not deleted or replaced. It may update the name/description/price of the 37 seeded themed packs; review before reapplying if owners have customized these.

Verification queries:

```sql
select count(*) as active_packs from public.yugioh_shop_packs where is_active;
select count(distinct card_id) as archive_coverage
  from public.yugioh_shop_pack_cards where pack_id like 'archive-vol-%';
select count(*) as catalog_count from public.yugioh_cards where language_code='en';
select p.category,count(*) as packs,min(p.pool_size) as min_pool
  from public.yugioh_shop_packs p
 where p.is_active group by p.category;
```

The release was verified for 41 active packs, 14,681/14,681 archive coverage, no insufficient published card pools, and a rollback-only duplicate-safe purchase smoke test. Authenticated browser testing and Cloudflare deployment confirmation have not been performed.
