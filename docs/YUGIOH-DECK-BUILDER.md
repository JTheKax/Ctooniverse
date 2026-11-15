# CTooniverse Yu-Gi-Oh! Deck Builder

## Files and URL
- `yugioh-deck-builder.html` — responsive interface
- `yugioh-deck-builder.css` — neon arcade styling
- `yugioh-deck-builder.js` — search/edit/save/import/export functionality
- `sql/yugioh-player-decks.sql` — applied database schema and access policies
- Deployment URL: https://ctooniverse.jthekax21.workers.dev/yugioh-deck-builder.html
- Links: Cards Hub, card catalog, and Duel Arena.

## Features
- Search the existing 14,681-card English-language Supabase catalog by name, card type, or archetype.
- Display card thumbnails using the **self-hosted** artwork cache; do not directly hotlink YGOPRODeck's images.
- Build Main (40–60 for completed decks), Extra (0–15), and Side (0–15) card lists.
- Three copies maximum of each catalog card across all zones, including alternate-art versions of that card. Tokens and Skill Cards are excluded from regular decks.
- Main/Extra placements are checked against card type; Fusion, Synchro, Xyz and Link are Extra Deck monsters.
- Add, remove and move cards between permitted zones; save as a draft even before reaching 40 Main Deck cards.
- User-scoped saved decks require a Supabase login. Visitors can build an unsaved guest draft in localStorage on the current device.
- `.ydk` file import and export; invalid, unknown or misplaced card IDs are rejected on import.
- TCG Forbidden/Limited/Semi-Limited fields from the imported snapshot trigger **advisory warnings** rather than hard tournament-legal certification.

## Database
`public.yugioh_player_decks` has a UUID key, a `user_id` foreign key to Supabase Auth, and three `bigint[]` fields containing card IDs (including duplicates). A row-level-security policy gates SELECT/INSERT/UPDATE/DELETE by `auth.uid() = user_id`. Anonymous users have no grants.

The `yugioh_validate_deck` trigger validates each save atomically and prevents invalid type placement, unknown IDs, bad copy counts and nonstandard Skill/Token cards. The `updated_at` timestamp changes on deck edits.

## Limitations
The deck builder does not yet pass custom decks into Duel Arena. Duel Arena retains its existing simplified predefined card pool and rules. Saved decks are private player data, not public collection ownership or a tradable in-game asset.

Tournament legality is **not certified**. This database may include cards not eligible for a particular TCG region, outdated banlist snapshots and other card restrictions. Check the latest official list before competitive play:
https://www.yugioh-card.com/en/limited/list/

Reference rules: official Yu-Gi-Oh! Rulebook (Main 40–60, Extra and Side <=15, three copies across all zones).

## Quick verification
1. Load the deck builder and search `Dark Magician`.
2. Add up to 3 copies in Main/Side combined; confirm a 4th is disabled.
3. Search `Blue-Eyes Ultimate Dragon`; confirm the Extra and Side buttons appear, not Main.
4. Import a valid `.ydk` list and export it.
5. Sign in, save an unfinished deck, reload the page, load it, edit/save again, then delete it.
6. Confirm a second logged-in account cannot read another player's deck.
7. Confirm desktop and mobile layouts both show all zones.

The SQL storage/RLS path was verified with a transactionally rolled-back authenticated test insert. Live authenticated browser UI and Cloudflare publication still require external verification.
