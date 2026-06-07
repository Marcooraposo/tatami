# Environments

## Branches
- **`main`** → production. Merge here to release.
- **`dev`** → staging. Day-to-day work happens here; pushes auto-deploy to a Vercel preview URL.

Workflow: commit to `dev` → test on the preview URL → open a PR `dev → main` → merge to release.

## Databases (two Supabase projects)
- **PROD project**: `pcqkkmhmgsjlitonzxxb` (current).
- **DEV project**: create a second free Supabase project, then run all migrations
  (`001`–`005`) in it. Paste its URL + anon key into `ENV.dev` in `supabase-client.js`.

The app is static (no build step), so it selects the project at runtime by hostname:
- hostname in `PROD_HOSTS` (in `supabase-client.js`) → PROD project
- anything else (localhost, Vercel previews, dev branch) → DEV project
- if `ENV.dev` is blank, dev falls back to PROD (so nothing breaks before setup)

Check the browser console on load — it logs `[tatami] environment: …`.

## Vercel
- Production branch = `main` (Settings → Git → Production Branch).
- Preview deployments are automatic for every other branch/PR, including `dev`.
- Add any custom production domain to `PROD_HOSTS` so it maps to the prod DB.

## Securing the demo
**1. Password gate (Edge Middleware, `middleware.js`)**
- Set env vars in Vercel → Settings → Environment Variables:
  - `DEMO_PASSWORD` = the shared password (required to enable the gate)
  - `DEMO_USER` = username (optional, defaults to `demo`)
- With no `DEMO_PASSWORD` set, the gate is disabled (fails open) — so set it on
  the deployment you want protected. Visitors get a browser Basic-Auth prompt.
- `robots.txt` disallows indexing.

**2. Read-only demo database (`supabase/migrations/006_demo_readonly.sql`)**
- Run on the **demo** Supabase project only. Replaces the open `allow_all`
  policies with SELECT-only access for `anon`, so visitors can read everything
  but cannot insert/update/delete.
- Do NOT run on prod (prod gets auth-scoped policies later).
- The app degrades gracefully: curriculum wizard/hide writes show
  "read-only demo — changes are not saved" instead of an error. The rest of the
  app runs on in-memory `data.js` + `localStorage`, so each visitor gets a
  private sandbox that resets on reload.
