# Yu-Gi-Oh! card artwork integration

CTooniverse's card database holds **14,681 card records** and **14,853 indexed image variants** (including alternate artwork for 125 cards) as of 2026-11-15.

## English-only catalog policy

The source import uses YGOPRODeck API v7's default language (English). Do **not**
supply `language=fr`, `language=de`, `language=it`, or `language=pt` to future imports.

The Supabase `yugioh_cards.language_code` column defaults to `en` and a
database check constraint rejects non-English language codes, including
explicit non-English language tags in imported `card_data`. Rebuild/import
jobs must set their language explicitly instead of assuming localized source
data is English. English card names may legitimately include accented letters,
stars, Greek letters, and decorative punctuation; those are **not** reasons
to delete those cards.

An English translation of an OCG-only card is still an English-language
catalog record. Removing OCG-exclusive cards would be a separate decision
based on edition/region, **not** a language filter.

## Hosting

YGOPRODeck API v7 provides artwork references in `card_images` but explicitly requires you to **download and re-host images rather than hotlink them**. Its source server can block high-volume fetchers. Documentation: https://ygoprodeck.com/api-guide/

Card images are **not committed to GitHub**. Artwork is stored in the Supabase Storage public bucket `yugioh-artwork`:

- `small/{image_id}.jpg` for browsing and the simplified duel.
- `full/{image_id}.jpg` for the database's expanded card-details view.

A small Edge Function, `yugioh-artwork`, validates each image ID against `public.yugioh_artwork_variants`. On a cache miss it downloads the corresponding fixed-source JPEG, verifies it, stores it, and returns the image. Subsequent browser requests use the public Storage URL, avoiding repeat source downloads.

The frontend attempts the Storage URL first. If the image has not yet been downloaded, it falls back to the Edge Function through a limited-concurrency queue. **An image is downloaded when first viewed; all 14,853 images have not been pre-uploaded.** This avoids a large up-front bill and keeps storage usage proportional to actual views. Keep an eye on Supabase Storage usage and limits as the catalog is browsed.

## Files

- `yugioh-cards.html`, `yugioh-cards.js`, `yugioh-cards.css`: searchable catalog, gallery and alternate-art selector.
- `yugioh-duel.js`, `yugioh-duel.css`: displays the same hosted images for its fixed 26-card prototype pool.
- `supabase/functions/yugioh-artwork/index.ts`: server-side download/cache function.
- Supabase `yugioh_cards.art_image_id`: primary image ID for the card search results.
- Supabase `yugioh_artwork_variants`: 1-to-many card artwork variants with read-only public access.

## Ownership and usage

Yu-Gi-Oh! card art and text belong to Konami / 4K Media. CTooniverse is an unaffiliated fan site and must not claim ownership or distribute paid copies of the artwork. Check rights and applicable permissions before using artwork commercially.

To add newly released cards, refresh the card database and artwork reference index, then images will cache when viewed. Avoid exposing the Supabase secret key in client code or granting public storage upload permissions.
