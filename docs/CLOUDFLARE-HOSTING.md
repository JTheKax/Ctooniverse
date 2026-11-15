# CTooniverse Cloudflare hosting checklist

Primary public URL: https://ctooniverse.jthekax21.workers.dev

## Hosting layout
- GitHub repository: https://github.com/JTheKax/Ctooniverse ; production source branch: `main`.
- Cloudflare Workers is intended as the sole website host. Verify the Worker serves its own static assets or deploys the GitHub repository directly, **not** by proxying or fetching the Render site.
- Supabase handles account authentication and data; leave that project intact.
- The old Render static site is currently kept only to redirect existing users. Removing it will stop the old `onrender.com` URL (and its redirect).

## Supabase Auth configuration (manual owner step)
Open https://supabase.com/dashboard/project/hsxdyxdazsdmpucyhqly/auth/url-configuration

1. Set **Site URL** to `https://ctooniverse.jthekax21.workers.dev`.
2. Ensure the **Redirect URLs** allow list contains these exact URLs:
   - `https://ctooniverse.jthekax21.workers.dev/account.html`
   - `https://ctooniverse.jthekax21.workers.dev/login.html`
   - `https://ctooniverse.jthekax21.workers.dev/owner.html`
3. Inspect Auth email templates for any hard-coded `ctooniverse.onrender.com` links; use the appropriate `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}` variables if needed.
4. Keep the old allowed URLs only if legacy email links must continue working during migration. Remove them after those links expire and their use has ended.

These Auth settings cannot be changed by edits to this GitHub repository alone.

## Source code
- `login.js`: password-reset destination points to Cloudflare.
- `register.js`: sign-up confirmation destination points to Cloudflare.
- `owner-auth.js`: email magic-link destination points to Cloudflare.
- Their HTML entry points use versioned script URLs to refresh browser caches.
- The hostname-conditional redirect script in HTML only runs on `ctooniverse.onrender.com`; it is harmless on Cloudflare. Leave it in place while the Render redirect is retained.

## Validate before retiring Render
1. Confirm Cloudflare deploys updates from `main` and supports all static assets, including nested /prototypes/ paths. If GitHub deploy is not configured, publish this updated source to Cloudflare manually.
2. Confirm the Cloudflare Worker script and routes never fetch, proxy, or otherwise depend on `https://ctooniverse.onrender.com`.
3. Test homepage, shop, games, CToon images, and account pages directly using the Cloudflare URL.
4. With an account you control, test registration email confirmation, password recovery, and owner magic-link sign-in (do not share login tokens).
5. Inspect browser Developer Tools / Network on Cloudflare and verify no requests to `ctooniverse.onrender.com`.
6. Leave Render running until old visitors no longer need its redirect. Removing Render breaks the old URL; it does not affect an independently hosted Cloudflare Worker.

This checklist does not claim the Cloudflare deployment or Supabase dashboard settings have been verified.
