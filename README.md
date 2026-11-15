# CTooniverse

**Official website:** https://ctooniverse.jthekax21.workers.dev

A fresh start for the CTooniverse Ctoon collecting website.

## Project rules
- **Single branch:** all changes go directly to `main`.
- **No feature, preview, or development branches.**
- Test changes before committing; keep backups for recovery.
- Deploy only from `main` when hosting is configured.

## Hosting and data
- **Primary website:** Cloudflare Workers at https://ctooniverse.jthekax21.workers.dev
- **Source:** GitHub `main` branch.
- **Accounts and data:** Supabase (the site is not fully standalone without Supabase).
- **Legacy visitors:** The old Render site redirects visitors to Cloudflare. Keep Render only for that optional redirect until it is retired.
- **Migration checklist:** See [Cloudflare hosting guide](docs/CLOUDFLARE-HOSTING.md) for the remaining account and deployment checks.

## Local preview
Open `index.html` in a browser. No build step or dependencies required.
