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
