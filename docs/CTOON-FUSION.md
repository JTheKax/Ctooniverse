# CToon Fusion Machine — one-character mode

The Owner → CToon Maker & Editor page now generates **one new character** using two existing catalog artworks. It no longer layers the two original characters into a split image.

## Setup

1. In the CTooniverse Supabase dashboard, open **Edge Functions → Secrets**.
2. Set **`OPENAI_API_KEY`** to an OpenAI API key from an account with image-generation billing/access. **Never** put this secret in GitHub, HTML, browser JavaScript, or chat.
3. The `ctoon-fuse-person` Edge Function is deployed on project `hsxdyxdazsdmpucyhqly`. It automatically reads the secret at runtime.
4. Open the latest Cloudflare deployment of `owner-ctoon-maker.html`, sign in as the site owner, choose two different CToons, and click **Fuse into One Character**.
5. Review the generated artwork; download it, regenerate (each request may incur usage charges), or click **Create Fusion CToon** to save it to the catalog. A custom finished image may still be uploaded instead.

## Technical notes

- Function: `supabase/functions/ctoon-fuse-person/index.ts` — image editing using both original source URLs with explicit one-character instructions, returns WebP.
- Client: `ctoon-fusion.js` — explicit click to generate; does **not** run generation on source selection or page load.
- Only a signed-in account listed in `site_owners` can generate an image. The function enforces this server-side.
- Image references are read from `ctoon_catalog`. Input URLs are constrained to the expected GitHub image folder or public CToon Fusion Storage path.
- Output is returned to the owner for review; saving uploads to the existing restricted `ctoon-fusions` bucket, then calls `owner_create_ctoon_fusion`. Original source CToons are preserved. New catalog entries remain Sold Out until the owner changes availability.
- Browser requests never receive the OpenAI API key. Don't disable the Edge Function's server-side owner authorization.
- If the secret has not yet been configured, generation gives an actionable message instead of claiming a split collage is a fused person.

## Verification

- Confirm `ctoon-fuse-person` is ACTIVE in Supabase.
- Confirm the `ctoon-fusions` bucket and `owner_create_ctoon_fusion` RPC exist.
- Test with the actual owner sign-in and API key to verify model access and final artwork quality; a static code check cannot verify AI-generated visual content.
