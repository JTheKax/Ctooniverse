# CTooniverse Yu-Gi-Oh! Card Shop

## Pages and links
- Card Shop: `yugioh-card-shop.html` / `yugioh-card-shop.css` / `yugioh-card-shop.js`.
- My Yu-Gi-Oh! Cards is the collection section at `yugioh-card-shop.html#ycs-collection`.
- The sitewide Cards dropdown and Cards Hub link directly to the new shop and collection.
- Intended Cloudflare route: https://ctooniverse.jthekax21.workers.dev/yugioh-card-shop.html.
- Deployment to Cloudflare and end-to-end browser sign-in must be verified separately.

## Shop inventory (virtual Cartoon Coins)
| Pack | Coins | Cards | Database pool |
| --- | ---: | ---: | --- |
| Duelist Essentials | 250 | 5 | All eligible English catalog cards |
| Dragon Legends | 400 | 5 | Dragon / Dragon-themed cards |
| Spellcaster Vault | 400 | 5 | Spellcaster / magician-themed cards |
| Toon Theater | 450 | 5 | Toon cards |

Each pack draws five distinct cards **without replacement within a single opening**. Cards can repeat between separate purchases and increase owned quantity. Packs are CTooniverse-created themed virtual products, **not official Konami packs**, and do not claim any official rarity odds. No payments with real money are implemented.

Pack definitions are stored in `yugioh_shop_packs`. Eligible catalog card IDs are mapped via `yugioh_shop_pack_cards` and are not editable by regular users. To change a pack's card pool or price, an administrator must apply reviewed SQL changes server-side.

## Persistent ownership and payment integrity
- `yugioh_player_cards` tracks quantity of each actual card ID owned by an authenticated user; players have **SELECT only** on their own rows.
- `yugioh_pack_openings` records the purchase, cost, awarded card IDs, and remaining wallet balance; players have **SELECT only** on their own rows.
- The only pack-minting operation is `open_yugioh_pack(p_pack_id text, p_request_id uuid)`, an authenticated-only, tightly scoped SECURITY DEFINER RPC with a fixed empty search path and full schema-qualified tables.
- The function checks `auth.uid()`, pack availability and actual price, available coin balance, server-side card pools, and quantity. A row lock on `coin_wallets` prevents competing purchases from overspending.
- The debit, `coin_ledger` entry, collection inventory additions, and receipt insert occur **atomically** in one database transaction.
- A unique `(user_id,request_id)` pair makes a retried request return its original receipt instead of charging twice; the frontend remembers the request ID in sessionStorage during uncertain network results.
- Card artwork is loaded from existing CTooniverse Supabase Storage, with the existing artwork Edge Function as fallback. It is not hotlinked to YGOPRODeck.

## Permanent starters and custom decks remain separate
Starter choice is made once in Duel Arena (Yugi, Kaiba, Joey, Pegasus) and gives **no owned cards**. This shop is the first workflow that mints collectible Yu-Gi-Oh! cards. The standalone deck builder remains a reference editor that can search all eligible English cards; drafts do not mint ownership and currently do not play as decks in the simplified Duel Arena.

## Validation
- The four live SQL card pools had 14,451, 1,174, 881, and 35 eligible card IDs, respectively.
- The database denies `anon` collection reads and pack RPC execution.
- Authenticated players cannot directly INSERT collection cards.
- A rolled-back authenticated SQL smoke test verified five drawn cards, one ledger debit, and a duplicate request returning the same receipt; no actual player coins or cards were changed by the test.
- JavaScript syntax and DOM ID integrity checks should be rerun on updated source. Manual signed-in browser testing and Cloudflare asset publication are outstanding.
