# Tatami — Architecture & Roadmap

## Current state (today)
A single, fully-populated academy ("Iron Roots Academy") rendered by `admin.html`
with mock data from `data.js`. This is the **demo/sandbox** — it showcases every
feature with realistic data. Most screens read from in-memory `data.js` globals;
only the **curriculum** feature reads/writes Supabase.

This demo is intentional and stays working. It will eventually become "the demo
tenant rendered through the multi-tenant app" rather than a separate codebase.

## Target product — multi-tenant SaaS
Individual users sign up, onboard, create their own **academy instance**, enable
the features they need, and enter their own data. Each tenant's data is isolated
and protected.

### Decisions locked in
- **Multi-academy per user:** in scope for the *future*, not now. Design the data
  model so one user can belong to / switch between multiple academies, but don't
  build the switcher yet.
- **Students get their own app:** students authenticate and log into the student
  app (`student.html`) to see their own data. So `auth.users` maps to **both**
  staff and students, distinguished by role.
- **Not building tenancy now:** continue improving the single-tenant app first;
  tackle multi-tenancy as a dedicated phase later.

### Tenancy model
- Shared-schema multi-tenancy on one Supabase project.
- Every domain table carries `academy_id`. One `academies` row = one tenant.
- Membership via `academy_members (academy_id, user_id, role)`,
  role ∈ `owner | instructor | front-desk | student`.

### Data segregation & encryption
- **Isolation:** Row-Level Security. Replace today's `allow_all` policies with
  tenant-scoped policies ("only rows where `academy_id` is in my memberships").
  This is the real enforcement and must land before screens are migrated to
  Supabase tenant-unaware.
- **Encryption:** at-rest (Postgres default) + in-transit (HTTPS) already covered.
  Add **field-level** encryption (pgsodium/Vault) only for sensitive PII —
  injury/medical notes, minors' data — chosen deliberately to preserve querying.

### Onboarding → instance creation
Sign up → create academy → pick sport(s) → run curriculum wizard → choose
features → invite staff → enter/import data. Academy creation done via a
transactional Postgres RPC (academy row + owner membership together).

### Feature flags
`academy_features (academy_id, feature_key, enabled)` (or jsonb on `academies`).
Sidebar nav + routes read this, so each academy sees only its enabled features.
Also the basis for pricing tiers.

### Seeding new tenants
- **Shared reference data** (BJJ grading system, 128-technique master library,
  modules) = global, read-only, referenced by all tenants.
- **Fictional people/classes/attendance** = demo-only; never seed real tenants.
- New academies start empty; optional "load sample data" for exploration.
- Demo academy = a normal tenant row flagged `is_demo = true`, read-only.

## Migration path
1. **Now:** keep demo working; treat `data.js` as demo-only seed.
2. **Improve the single-tenant app** (current phase) — refactors, finish features,
   resolve the split data layer screen by screen.
3. **Foundation:** enable Supabase Auth; add `academy_members`; add `academy_id`
   everywhere; replace `allow_all` RLS with tenant-scoped policies.
4. **Read/write cutover:** migrate screens off `data.js` onto academy-scoped
   Supabase queries. Build every query academy-scoped from the first screen.
5. **Onboarding & features:** academy-creation RPC + feature flags wired to nav.
6. **Student auth:** student app logs in via Supabase Auth, sees only own records.
7. **Hardening:** field-level PII encryption, audit logging, backups, billing tiers.

## Guardrail
Decide the tenant boundary (`academy_id` + RLS) **before** migrating screens off
`data.js`. Retrofitting isolation later means rewriting the data layer.

## Known tech debt (see code review)
- Split data layer: most screens use `data.js`, not Supabase; `DB_PERSIST` unused.
- `admin.html` is a 14k-line monolith with heavy inline styles.
- `oss.html` is dead (superseded by `admin.html`).
- Styling split between `styles.css` and an inline `<style>` in `admin.html`.
- Open `allow_all` RLS policies — temporary, replace with auth-based policies.
- Curriculum `techniques`/`modules` names are English-only (rest of app is en/pt).
