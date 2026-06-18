# openmat.me — Design System

**openmat.me** is a management platform for martial-arts academies (built first for Brazilian Jiu-Jitsu). It connects everything an academy already has — students, attendance, curriculum, belts, billing — into one calm, modular tool. Academies switch on the modules they need and add the rest as they grow. **UX is a core selling point: the product wins by being simple, uncomplicated, and quiet, not flashy.**

The design system serves three product surfaces:

- **Admin web app** — the academy owner / head coach's desktop dashboard (students, curriculum, grading, schedule, billing, insights).
- **Student mobile app** — a member-facing phone app (belt progress, next class, check-in, streaks).
- **Onboarding wizard** — the academy setup flow (details → branding → modules → grading → team).

> Internally the app was prototyped under the working name **"Tatami"**; the canonical brand is **openmat.me**. Use openmat.me everywhere.

### Sources
- Codebase: attached local folder `OSS/` (single-file prototypes: `admin.html`, `student.html`, `onboarding.html`, `index.html` marketing site; data model in `data.js`; `ARCHITECTURE.md`). Belt/grading colors and the EN/PT/ES/FR copy come from `data.js`.

---

## Design principles

1. **Calm over flashy.** Lots of white space, hairline borders, soft low-spread shadows. One accent color, used sparingly. No gradients, no glow, no decoration that doesn't carry meaning.
2. **Ink first, blue second.** Primary actions are near-black ("ink"). Blue is reserved for links, active state, progress, and focus — emphasis, not default.
3. **The data is the design.** Big confident numbers (Bricolage Grotesque, tabular), legible tables, honest progress bars. The belt/grading system is the one place domain color is allowed to sing.
4. **Modular & progressive.** Surfaces should feel complete with modules off, and richer with them on. Never imply something is locked.

---

## CONTENT FUNDAMENTALS

- **Voice:** plain, direct, benefit-led. Talk to the academy owner as **"you."** Lead with the outcome ("See who's ready to be promoted"), not the feature ("Promotion-tracking engine").
- **Casing:** sentence case for everything — headings, buttons, labels — **except** small UPPERCASE tracked eyebrows (e.g. `THE ENGINE`, `READY TO PROMOTE`).
- **Tone:** confident, unhyped, a little warm. Jiu-jitsu people talk like practitioners, not marketers.
  - ✅ "Turn your academy's data into student progress."
  - ✅ "Switch on what you need today, add the rest as you grow."
  - ❌ "Revolutionize Your Dojo With Next-Gen AI Synergy!"
  - ❌ "Unlock 🔥 10x growth 🚀"
- **Numbers & money:** tabular figures (`.tnum` / `font-variant-numeric: tabular-nums`). Euro is the default currency in samples (`€2,480`).
- **Multi-language:** the product ships **EN · PT · ES · FR** (Portuguese matters most — BJJ + Brazil). Keep copy short and translatable; avoid idioms and puns. Don't over-invest in localized specimens, but never hard-code English-only layouts that can't stretch ~30%.
- **Emoji:** functional only, inside the apps (🥋 ✓ 📅 sparingly). Never in marketing, never as decoration.

---

## VISUAL FOUNDATIONS

- **Color:** a near-neutral, slate-leaning palette. Canvas `#f6f7f8`, cards pure white, text `#14171c`, muted `#5b6472`. One accent blue `#2563eb` for links / active / progress / focus. Semantic green / amber / red only for status. Full dark theme ships (`[data-theme="dark"]`). See `tokens/colors.css`.
- **Belt colors** (the signature): white, blue, purple, brown, black (adult) + grey, yellow, orange, green (kids), plus gold stripe tape. Never hard-code belt hex — use `--belt-*` tokens (`tokens/belts.css`) or the `BeltChip` component.
- **Type:** **Bricolage Grotesque** for display, headings, and big numbers (tight `-0.025em`, short leading). **Inter** for all body and UI. Monospace for IDs / data accents. Scale in `tokens/typography.css`.
- **Spacing & radius:** 4px base scale. Radii are gentle — cards `14px`, inputs/buttons `10px`, pills `999px`. Nothing sharp, nothing bubbly. `tokens/spacing.css`.
- **Elevation:** restrained, low-spread shadows, light from above. Cards barely lift (`--shadow-card`); modals/hero lift more. No hard drop shadows. `tokens/elevation.css`.
- **Backgrounds:** flat color only. No gradients, no textures, no full-bleed photography in product UI. The marketing site is stark black/white.
- **Borders:** 1px hairlines (`--border`) everywhere; `--border-strong` for inputs and weighted dividers.
- **Cards:** white surface, 1px hairline border, `--shadow-card`, `14px` radius, 24px padding. Lists/tables go flush (`pad={false}`).
- **Hover:** subtle — surfaces tint to `--surface-alt`; ink buttons darken to `--ink-soft`; links underline. **Press:** slight darken (no big scale/bounce). **Focus:** 3px accent ring (`--ring`).
- **Animation:** fast and quiet — 120–180ms ease transitions on color/background/width. No bounces, no springs, no attention-grabbing motion.
- **Layout:** admin = 240px sticky sidebar + 56px sticky topbar + max ~1180px content. Student app = 390px phone frame, 64–78px bottom tab bar. Marketing = ~1100px centered container.

---

## ICONOGRAPHY

- **Line icons from [Lucide](https://lucide.dev)** — stroke ~1.75, round caps, no fill. This matches the hand-built inline SVGs in the marketing site. Loaded from CDN (`https://unpkg.com/lucide`); render with `<i data-lucide="name"></i>` then `lucide.createIcons()`. *(Substitution flag: the prototype used bespoke inline SVGs, not a named icon set — Lucide is the closest consistent match. Swap if you adopt an official set.)*
- **Logo:** open-corner mat mark (rounded-square outline with the top-right corner left open) + lowercase `openmat.me` wordmark (the `.me` lighter). Files in `assets/` (`logo-mark.svg`, `logo-mark-invert.svg` for dark surfaces).
- **Emoji:** functional, in-app only (see Content Fundamentals).
- No PNG icons, no icon font, no decorative illustration in the current product.

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link. `@import`s everything below.
- `readme.md` — this file. `SKILL.md` — Agent-Skills wrapper.
- `_ds_bundle.js` — auto-generated component bundle (exposes `window.OpenmatDS`). Do not hand-edit; regenerate from `components/*` if sources change.

**tokens/** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `elevation.css`, `belts.css`, `base.css`

**assets/** — `logo-mark.svg`, `logo-mark-invert.svg`

**guidelines/** (foundation specimen cards) — type (display / body / eyebrow-mono), color (ink / neutrals / accent-semantic / belts), spacing (scale / radius / elevation), brand (logo / voice / iconography)

**components/**
- `core/` — `Button`, `Card`, `Avatar`, `Badge`
- `forms/` — `Input`, `Select`, `Switch`
- `domain/` — `BeltChip` (signature grading badge), `StatCard`, `ProgressBar`, `NavItem`

**ui-kits/** (full screens, `.dc.html`)
- `Admin Dashboard` — coach's desktop dashboard
- `Student App` — member phone app
- `Onboarding` — academy setup wizard (module step)

---

## Using components

Components are React, bundled onto `window.OpenmatDS`. In a card or kit:

```html
<link rel="stylesheet" href="styles.css" />
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="_ds_bundle.js"></script>
<script>
  const { Button, BeltChip, StatCard } = window.OpenmatDS;
  // React.createElement(Button, { variant: 'primary' }, 'Save')
</script>
```

Belt colors, type, spacing — always reference the CSS custom properties, never literal hex/px.
