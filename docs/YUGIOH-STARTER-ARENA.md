# CTooniverse Yu-Gi-Oh! — Arena starter decks

## User flow

1. When a new **signed-in** player first visits `yugioh-duel.html`, show a four-card starter chooser.
2. Players may inspect the lists before choosing. Templates cannot be edited, replaced, or deleted by regular players.
3. They choose exactly **one** permanent starter: Yugi, Kaiba, Joey, or Pegasus. The choice is saved in `yugioh_player_starter_choices` with the player's Supabase Auth UUID as its primary key. There are **no UPDATE or DELETE permissions** for regular players.
4. On later visits, the chosen starter is automatically loaded into Arena. The player cannot switch to a different starter.
5. **No collectible cards are awarded.** A starter selection never inserts into a card inventory, player collection, reward, pack opening, or shop table. Only future pack-opening reward logic should mint collectible card inventory; that system is not implemented in this change.
6. Custom saved deck drafts are still editable in `yugioh-deck-builder.html`, but they do not alter the locked starter or convert starter cards into owned cards.

Guests who are not signed in are prompted to sign in before choosing. We intentionally do not create a temporary "owned" guest starter.

## Immutable templates

The `yugioh_starter_decks` table contains four predefined **read-only** 40-card Main Decks, plus reference Extra Deck lists:

| Starter | Main | Extra | Focus |
| --- | ---: | ---: | --- |
| Yugi's Spellcaster Starter | 40 | 4 | Dark Magician, Magicians, defensive spells/traps |
| Kaiba's Dragon Starter | 40 | 5 | Blue-Eyes White Dragon, Dragon support |
| Joey's Red-Eyes Starter | 40 | 6 | Red-Eyes dragons, Warriors, Fusions |
| Pegasus's Toon Starter | 40 | 3 | Toon Kingdom, Toon monsters, Relinquished |

Every card ID was verified against the English-language `yugioh_cards` catalog and validated for Main/Extra Deck placement. The templates are character-inspired **fan starter designs**, not official retail starter deck reproductions.

DDL, RLS policies and deterministic starter-list seed values are preserved in `sql/yugioh-arena-starters.sql`.

## Arena implementation and limitations

- The selected starter's **Main Deck** is the active 40-card playable deck versus the existing CPU opponent.
- The previous 26-card standalone prototype engine remains **simplified**. Registered Monster names, Level, ATK and DEF load from the catalog; unknown Spell effects use an explicitly labeled **prototype** "gain 500 LP" effect, and unknown Trap effects cancel one attack. Pre-existing supported cards retain their existing simplified effects.
- The corresponding Extra Deck is **shown but currently not summonable**. Full Fusion, Ritual, Synchro, Xyz, Link, Toon, and other official effects are not implemented.
- Reference card artwork is retrieved from CTooniverse Supabase Storage, and missing images can be downloaded/rehosted by the `yugioh-artwork` Edge Function. No direct hotlinks to YGOPRODeck.
- No changes were made to `public.player_ctoons`, a Yu-Gi-Oh owned-card collection, coin wallets, the shop, pack inventories, or pack reward logic.
- Later features could implement actual Yu-Gi-Oh pack ownership, build an owned-card collection, and unlock further duel modes. Those must be explicit, separate workflows.

## Security checks

- `anon` can SELECT public templates but cannot select or insert choices.
- Authenticated players may SELECT and INSERT only their own starter-choice row.
- Authenticated players cannot UPDATE or DELETE templates or their choice.
- A one-user double-choice test inserted Yugi and attempted Pegasus in one database transaction; the second insert did not replace the first. The transaction was **rolled back**.
- Starter views and Arena loads **never call inventory/collection writes**.
- Cloudflare publication and an end-to-end signed-in browser duel still require external verification.
