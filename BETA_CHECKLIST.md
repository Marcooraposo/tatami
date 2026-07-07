# Admin-beta launch checklist (P4)

Tracks what's needed to ship the admin beta. **Code is done** (committed on `dev`).
The remaining items are infra/config that must be done in the Supabase + Vercel
dashboards — they can't be done from the repo.

## Code-complete (this branch)
- [x] P1–P2 data cutover (students, schedule/classes, attendance, grading, curriculum, events)
- [x] P3 modularity framework (`academy_features`, Settings → Modules, onboarding picker)
- [x] Tenant RLS on all operational tables; master library locked read-only (migration 014)
- [x] Password reset + recovery flow (`app.html`)
- [x] Terms page (`/terms`) linked from signup; Privacy already at `/privacy`
- [x] Client error logging (`errlog.js`) + Settings download button
- [x] Repeatable isolation smoke test (`scripts/smoke-isolation.sh`)

---

## DEV — done ✅
- [x] Ran **`014_master_readonly.sql`** on the dev project.
- [x] Smoke test passes **10/10** (`./scripts/smoke-isolation.sh`).

## You must do — PROD (before inviting academies)

### 1. Create the prod Supabase project
- [ ] New Supabase project (separate from dev). Note its URL + anon key.
- [ ] Set them in `supabase-client.js` env handling / `TATAMI_ENV` for the prod deploy.

### 2. Run the migration chain on prod (in order)
Run these — they build schema, the shared curriculum master library, tenancy, and
the student-app security model:
```
001, 003, 004, 005, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018
```
**Skip `002` and `006`** — `002` seeds the *demo* academy/students, and `006` is the
demo-only read-only lock (prod gets read-only via `014`). The backfills in 008/011
touch zero rows on a fresh project, so skipping the demo seed is safe.

> ⚠️ **Security-critical:** `016` (student-role RLS), `017` (hide instructor pay),
> and `018` (lock injuries/prospects/packages/discounts to staff) MUST be applied
> before any student is invited — without them, students can read/write other
> members' PII. The two smoke tests in step 5 verify this.

### 3. Supabase Auth config (prod)
- [ ] **Email confirmation: ON** (it's off on dev only).
- [ ] **Site URL** = `https://openmat.me` ; **Redirect URLs** include
      `https://openmat.me/app` and `https://openmat.me/admin`.
- [ ] **Custom SMTP / email provider** — wire a real provider (Resend recommended;
      Postmark/SES fine). Supabase's built-in email is rate-limited and not for
      production; signup confirmation, password reset, and recovery all depend on it.

### 4. Backups
- [ ] Enable daily backups / PITR on the prod project (Supabase Pro).

### 5. Prod smoke test (before inviting anyone)
- [ ] Run BOTH against prod with the prod URL + anon key:
      ```
      SUPABASE_URL=https://<prod-ref>.supabase.co SUPABASE_ANON_KEY=<prod-anon> ./scripts/smoke-isolation.sh    # expect 10/10
      SUPABASE_URL=https://<prod-ref>.supabase.co SUPABASE_ANON_KEY=<prod-anon> ./scripts/smoke-student-rls.sh  # expect 31/31
      ```

### 6. Ship the code
- [ ] Merge `dev` → `main` (Vercel auto-deploys `main` to the prod host). Do this
      AFTER the prod DB is migrated + smoke-tested, so the live code always has a
      backend that matches it.

---

## Out of scope for admin beta (later)
- Real email *notifications* to students (booking/grading) — P5+.
- Student app (Tier 2) identity/invite + student-role RLS — **P5**.
- Field-level PII encryption, audit logging, billing tiers.
