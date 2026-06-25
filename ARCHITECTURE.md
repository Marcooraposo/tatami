# Tatami — Architecture & Roadmap

## MVP & public-beta plan (source of truth)

**Goal:** a real, multi-tenant product an academy can sign up for and run daily,
with modularity as a first-class, visible feature. Build approach = **Option A**
(reuse the existing admin screens in "tenant mode", swapping each screen's data
source from `data.js` to academy-scoped Supabase). The demo stays working
throughout.

### Release strategy: two staged betas
1. **Admin beta** (first) — owner-side product is real for a few friendly academies.
2. **Student beta** (after) — turn on the **Tier 2** student app (writes: booking,
   check-in, event sign-up, belt-test) for those same academies.

### Modularity model
Small mandatory **core** + optional modules toggled per academy via
`academy_features`. The module **framework** is built for real (registry,
Settings "Manage modules", nav/route gating, `requires[]` deps). The modules it
toggles are a **mix**:
- **Real in MVP** (data fully cut over): Students, Schedule/Classes+Attendance,
  Grading, Curriculum, Events.
- **"Coming soon" placeholders** (registered + nice empty state, no data yet):
  Competition, Billing, Memberships, Analytics, Families, Announcements.
Onboarding shows available vs coming-soon modules (roadmap-as-marketing).

### MVP scope — admin
- **Core (mandatory):** Account/Auth, Academy + Settings (incl. module manager),
  People/Students.
- **Real optional modules:** Schedule/Classes + Attendance, Grading, Curriculum,
  Events.
- **Onboarding:** create academy → pick modules → guided first student.

### MVP scope — student app (Tier 2, second beta)
- **Identity:** invite-based login; link `auth.users` ↔ `students` (`students.user_id`).
- **In:** view schedule, belt/progress, curriculum progress, announcements, events;
  **book/cancel classes** (eligibility + capacity), **check in**, **register for
  events**, **request belt test**, edit basic profile. Module-aware (shows only the
  academy's enabled modules).
- **Out (fast-follow):** payments, messaging, push/email notifications,
  private-lesson requests, auto waitlist promotion.
- **RLS:** add a `student` role policy — read own record + academy public data;
  write only own bookings/check-ins/registrations/requests.

### Phased path
- **P1 — Tenant shell + Students:** ✅ done. session→active-academy context;
  tenant-vs-demo flag; cut Students (list/create/edit) to Supabase; empty-state onboarding.
- **P2 — Daily-ops:** ✅ done. cut Schedule/Classes + Attendance, then Grading, then
  Curriculum (per-academy config on auth), then Events.
- **P3 — Modularity framework:** ✅ done. `academy_features` + Settings manage-modules +
  nav gating + coming-soon placeholders + onboarding module picker.
- **P4 — Admin-beta hardening:** code ✅ done; infra/config pending (see
  `BETA_CHECKLIST.md`). prod tenancy migrations + tenant RLS (master library locked
  read-only via 014); email confirmation ON + real email provider (Resend/SMTP) +
  password reset; terms page; error logging; backups; isolation smoke-test.
  → **Ship admin beta.**
- **P5 — Student app (mobile PWA).** `student.html` is already a 430px responsive
  app on demo data; P5 wires it to real auth + Supabase. Approach: installable PWA,
  not native (wrap in Capacitor later if push/store needed). Sub-phases:
  - **P5a — Identity & invite linking** *(in progress)*: `students.user_id`,
    `student_invites` + staff RLS, `claim_student_invite()` RPC (links auth user →
    student row + adds `student` membership; invite encodes the academy, so no
    picker). Admin "App link" generates a one-time `/join` link; `join.html` redeems
    it. Migration 015.
  - **P5b — student-role RLS** *(the hard part)*: split `auth_is_staff()` vs student;
    students read own record + academy-public data (classes/events/curriculum/
    announcements) and write only own bookings/check-ins/registrations/test-requests
    — never other students' PII.
  - **P5c — reads**: student-scoped hydrate (mirrors admin `tenant.js`); replace
    `data.js` reads; module-aware via `academy_features`. Keep `/demo` on data.js.
  - **P5d — writes**: book/cancel, check-in, event register, request belt test, edit
    profile — own rows only.
  - **P5e — PWA**: `manifest.json` + service worker (offline shell + install) +
    apple-touch-icon.
  - **P5f — verify & ship**: extend isolation smoke test for the student role; invite
    real students at a friendly academy. → **Ship student beta.**

### Honest notes
- ~80% of effort is the P1–P2 data cutover. Student writes (P5) come last — they
  need the admin schedule/classes to exist first.
- Adoption risk: student value only realizes if academies actually invite members —
  make the invite UX frictionless.

### Student import & invites (roster onboarding)
Most academies arrive with an **existing roster** (spreadsheet or another system),
so importing students is core to onboarding — not an afterthought.
- **Beta (technically easiest):** **bulk manual entry** — a multi-row form to add
  several students at once with key fields (name, DOB/age, belt, contact, tags).
  No spreadsheet parsing required for beta.
- **Future:** CSV/spreadsheet import with column mapping + validation.
- **Invite links (future, ties to Tier 2 student app):** generate a per-student
  **invite token** that is pre-linked to the academy *and* that student record.
  When the student authenticates via the link, their `auth.users` account is
  auto-linked to the existing student record — **no academy selection needed**
  (the invite already encodes the academy).
- **Self-onboarding (later):** a public academy **directory / public join link** so
  members can find an academy (or open its link), sign up, **buy a membership, and
  book classes without the manager** — for academies that opt into it.

Priority order: (1) onboard academies that already have a roster (bulk manual →
CSV), (2) invite-link account linking, (3) public self-onboarding.

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
- **Multi-academy per user → multi-org / multi-location:** future, not now. Design
  so one user can belong to / switch between multiple academies; the parent
  **organization** + **location** model is specced in *Multi-org & multi-location
  (future)* below. Build the sidebar academy switcher now as the UX seam; slot the
  data model in later.
- **Students get their own app:** students authenticate and log into the student
  app (`student.html`) to see their own data. So `auth.users` maps to **both**
  staff and students, distinguished by role.
- **Auth:** Supabase Auth via **email magic link + Google OAuth**.
- **Tenancy build approach:** isolated foundation first — DB schema + auth +
  academy-context layer kept separate; the demo (data.js) stays untouched, and
  screens migrate to Supabase in a later phase.

### Tenancy progress
- ✅ **Migration 008 (foundation):** `profiles`, `academy_members`, `academy_id`
  on all operational tables, `auth_is_member()` helper, and tenant-scoped RLS
  replacing allow_all on operational + academies/academy_sports tables.
  Reference/curriculum tables left public-read for the demo (cutover later).
- ⏭ Next: enable Supabase Auth (magic link + Google); login page + session +
  current-academy context; onboarding academy-creation RPC (inserts the owner
  membership via SECURITY DEFINER); then screen-by-screen data cutover.

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

### Multi-org & multi-location (future)
Today one `academies` row = one tenant = one gym. Two real-world shapes break that
1:1 and need a **parent object above the academy**:
- **One academy, many locations** — a brand runs several physical gyms that share
  curriculum, branding, and staff but keep separate schedules / attendance / rosters.
- **One user, many organizations** — an owner or coach manages unrelated brands.

**Model — introduce `organizations` as the parent; today's "academy" becomes a `location`:**
```
organization        (brand / billing entity)
  └─ location        (physical gym = today's academies row + org_id)
       └─ operational data (students, classes, attendance, events, …)
```
- `organizations(id, name, …)` — owns shared config.
- `academies` gains `org_id` (optionally rename → `locations`). Per-row scoping
  stays at the location level — operational tables keep `academy_id`, so no data
  rewrite.
- **Roles, two tiers:**
  - `organization_members(org_id, user_id, role)` — `owner | admin`: manage every
    location, staff, curriculum, billing.
  - `academy_members(academy_id, user_id, role)` — `instructor | front-desk`:
    scoped to one location. Org owners are implicitly members of every location.
  - A user managing N orgs = N `organization_members` rows.

**At ORG level (shared):** curriculum master + grading systems, accent / branding,
staff & admin user management, subscription / billing, and optionally a shared
student identity (one member training at two locations of the same brand).
**At LOCATION level:** schedule, classes, attendance, on-site instructors, events.

**RLS evolution:** `auth_is_member(academy_id)` becomes org-aware — a new
`auth_can_access_location(loc)` = member of the location **OR** admin of the
location's org. One helper changes; existing policies keep referencing `academy_id`.

**Active context:** persist `active_org` + `active_location` (localStorage now →
`user_preferences` later); the sidebar switcher sets both.

**Open decision — student identity:** student-per-location (simple, today) vs
student-per-org with per-location enrollment (one person trains at multiple sites).
Default to per-location for beta; revisit when multi-location ships.

**Migration (backward compatible — post-beta, "P6"):**
1. Add `organizations`.
2. Add `academies.org_id` (+ optional rename to `locations`).
3. Backfill one org per existing academy (1:1) — single-gym users unaffected.
4. Add `organization_members`; backfill academy owners → org owners.
5. Switch `auth_is_member` → location-or-org check.
6. Move shared config (curriculum master, accent, billing) up to org.

**Build the seam now, the model later:** ship the sidebar academy switcher (below)
during single-academy beta so the org/location tree slots in without re-teaching
the UI.

### Where the academy switcher lives
**Top-left of the sidebar, as its header** (replacing / under the `openmat.me`
wordmark) — the standard SaaS "workspace switcher" slot (Slack / Linear / Notion).
It shows the **current academy name + role** with a `▾`; the menu today lists the
user's academies (switch) + Sign out, and grows into: switch location,
**+ Add location**, **Manage organization** (user management, curriculum, billing).
Keep *account* actions top-right (avatar / sign out); *workspace identity* goes
top-left. Today the only hint of the active academy is the avatar initials in the
top-right — not discoverable, hence this gap.

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

## Grading systems (planned)
Each academy picks **one** grading system per sport at setup (1:1 via
`academy_sports.grading_system_id`), chosen from a list of available systems
(global templates + the academy's own customs). Custom systems are created by
**cloning a default template** (`is_default` marks templates; `academy_id`
null = global, set = academy-owned; add `based_on_id` for lineage).

A grading system is **self-contained for both age groups**. Reshape the
current flat `levels`/`promotion_rules` into:
```js
{
  ageBoundary: 16,                 // < boundary = kids track, ≥ = adult track
  tracks: {
    adult: { levels: [...], promotionRules: {...} },
    kids:  { levels: [...], promotionRules: {...} }
  },
  transition: { mapping: { 'kids-green': 'adult-blue', ... }, stripeReset: true }
}
```
- Both tracks are always specified (identical if the system doesn't differ by age).
- A student's **track is derived from age** (reuse the Kid/Adult age logic);
  `enrollments.currentLevelId` refers to a level within that track.
- **Kid→adult crossover** is defined by the system: when a kid reaches
  `ageBoundary` at the top of the kids track, map their belt to the adult track
  via `transition.mapping`, apply `stripeReset`, and log a `GRADING_LOG` entry of
  type `transition`.

Work required:
- Schema: add `age_boundary`, `based_on_id`; make `academy_sports.grading_system_id`
  a real FK; reshape `levels`/`promotion_rules` → `tracks`/`transition`.
- Make all promotion/stripe logic track-aware (`computePromotionStatus`,
  `computeNextSteps`, Grading screen, student profile, student app card,
  `setStudentStripes`, `promoteStudent`) with the crossover as a special case.
- UI: setup picker; grading-system editor (both tracks + transition + boundary);
  Promotion Rules split by Adult/Kids; track badge on belt displays.
- Migration: existing IBJJF system → `tracks.adult` + a new `tracks.kids`.
- Depends on grading data moving off `data.js` onto Supabase.

## Modular features (planned)
Every "page" is an isolated, optional **module**. Beyond a fixed set of base
modules, admins enable/disable everything else per academy.

**Base modules (always on):** Schedule, Classes, Students, Curriculum, Grading,
Settings.

### Module registry (single source of truth)
Today the sidebar and the router are two hardcoded lists kept in sync manually.
Replace both with one registry:
```js
const MODULES = [
  { id:'schedule', label:{en,pt}, icon, group:'Schedule', base:true,  render:Schedule },
  { id:'students', label:{en,pt}, icon, group:'People',   base:true,  render:StudentsList },
  { id:'grading',  …, base:true,  render:GradingScreen },
  { id:'events',   …, base:false, render:EventsList, requires:[] },
  { id:'billing',  …, base:false, render:BillingScreen, requires:['memberships'] },
  // …every screen
];
```
- **Sidebar** = enabled modules grouped by `group`.
- **Router** = `MODULES[section].render` instead of the giant switch.
- `base:true` modules can't be disabled.
- Optional `requires:[...]` captures inter-module dependencies (UI prevents
  disabling a needed dependency / warns).

### Per-academy enabled set
- `academy_features (academy_id, module_id, enabled)` (or jsonb on `academies`).
- Helper `isModuleEnabled(id)` = `base || in academy's enabled set`.
- Sidebar, router, dashboard shortcuts, and any embedded cross-module cards all
  filter through it. Navigating to a disabled module → redirect to dashboard.
- Cross-references must degrade gracefully: wrap every `go('x')`/embedded card for
  an optional module in `isModuleEnabled('x')`.

### Both apps
Module toggles apply to **admin and student apps**. A disabled module (e.g.
Events) disappears from the student app's nav/sections too. The student app reads
the same `academy_features` set.

### Admin UI
A Settings → "Manage modules" grid: all non-base modules with on/off toggles +
descriptions. Doubles as an onboarding step ("pick the features you need") and the
basis for pricing tiers.

### Build order
- The registry + generated sidebar/router + a Settings toggle UI can be built now
  against a local enabled-set (localStorage) — this also removes the current
  "two lists in sync" fragility and turns the manual tab removals into toggles.
- Move the enabled-set to `academy_features` in Supabase during the multi-tenant
  phase; wire into onboarding; scope by `academy_id`; tie to pricing tiers.

## Known tech debt (see code review)
- Split data layer: most screens use `data.js`, not Supabase; `DB_PERSIST` unused.
- `admin.html` is a 14k-line monolith with heavy inline styles.
- `oss.html` is dead (superseded by `admin.html`).
- Styling split between `styles.css` and an inline `<style>` in `admin.html`.
- Open `allow_all` RLS policies — temporary, replace with auth-based policies.
- Curriculum `techniques`/`modules` names are English-only (rest of app is en/pt).
