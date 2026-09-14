# Ledger — UI rebuild handoff

**Version:** 1.3 (third UI iteration)
**Branch:** `chore/render-auto-deploy` · **PR:** [#1](https://github.com/nisaco/Finance_Manager/pull/1)
**Status:** foundation + Overview + app shell rebuilt. 10 pages and 13 modals still on the old styling.

This document is the complete brief for continuing the rebuild. Read it end to end
before touching a file. Section 8 is a prompt you can paste into another assistant.

---

## 1. The one rule

**Presentation only. No logic changes.**

Every prop, handler, state variable, element `id`, `aria` attribute, context call and
API request must survive a rebuild untouched. The rebuild changes what the screen
looks like, never what it does. Concretely:

- Do not rename or remove props, or change their types.
- Do not touch anything under `server.ts`, `src/api/`, `src/context/` (beyond the two
  context exports already made for the preview harness), or any auth/Paystack path.
- Do not "improve" a calculation, even an obviously wrong-looking one. Report it
  instead — the numbers come from the server and the UI must agree with the ledger.
- Do not add a data fetch, a new field, or a derived figure the server does not send.
- Keep existing element `id`s: `navbar-brand-button`, `navbar-profile-selector-btn`,
  `navbar-menu-button`, `nav-tab-${id}`. Things outside the component reference them.

---

## 2. Stack

| Part     | Detail                                                              |
| -------- | ------------------------------------------------------------------- |
| Frontend | React 19, Vite 6, TypeScript, Tailwind **v4** (`@tailwindcss/vite`) |
| Backend  | Express 4 + TS, bundled by esbuild to `dist/server.cjs`             |
| Data     | MongoDB Atlas, with an in-memory fallback                           |
| Services | Paystack, Google Gemini, nodemailer, Google OAuth                   |
| Icons    | `lucide-react`                                                      |
| Font     | Satoshi, via Fontshare CDN (loaded in `index.html`)                 |

**Tailwind v4 has no `tailwind.config.js`.** Theme values come from `@theme inline`
in `src/design/foundation.css`. Source files are discovered from the CSS entry, which
is why the preview harness needs an explicit `@source` (see §6).

One service serves everything: `server.ts` mounts the API, serves `dist/` statically,
and falls back to the SPA.

```
npm run dev              # vite + api
npm run build            # vite build + esbuild server → dist/
npm start                # run dist/server.cjs
npm run preview:overview # build the design preview harness → preview-dist/
```

**Never commit `package-lock.json`.** The repo uses `bun.lock`; `npm run` recreates
the npm lockfile, so delete it before committing.

---

## 3. The design foundation

Everything lives in **`src/design/foundation.css`** (~800 lines). It is the only
place colours, sizes, radii, shadows and motion curves are defined. A rebuilt file
must contain **zero hex literals and zero raw pixel font sizes** — if you need a
value that does not exist, add a token rather than inlining it.

### 3.1 Design intent

The reference points are Ghanaian banking apps — Ecobank, MTN MoMo, GCB — and the
brief was: clean, professional, premium, and specifically **not looking AI-generated**.
In practice that means:

- Mobile-first, single column of stacked cards, generous whitespace.
- One accent colour, used for interaction only. Never for decoration.
- Hairline borders instead of shadows on cards. Elevation is reserved for things
  that genuinely float (drawer, popovers, sheets).
- No gradients, no glows, no coloured shadows, no glassmorphism, no 3D tilts.
- Icons: stroke `1.7`, never filled.
- Real states first-class: empty, loading, error. An empty card explains what to do.
- Amounts are the loudest thing on any screen.

### 3.2 Colour tokens (light only)

| Token                | Value     | Token             | Value     |
| -------------------- | --------- | ----------------- | --------- |
| `--lg-canvas`        | `#F4F5F7` | `--lg-ink`        | `#0C111D` |
| `--lg-surface`       | `#FFFFFF` | `--lg-ink-2`      | `#344054` |
| `--lg-sunken`        | `#FAFAFB` | `--lg-ink-3`      | `#667085` |
| `--lg-line`          | `#E7E9EE` | `--lg-ink-4`      | `#98A2B3` |
| `--lg-line-strong`   | `#D6DAE1` | `--lg-accent`     | `#0F5257` |
| `--lg-pos`           | `#067A55` | `--lg-accent-hover` | `#0B3E42` |
| `--lg-pos-soft`      | `#E6F4F0` | `--lg-accent-soft`| `#EAF1F1` |
| `--lg-neg`           | `#B42318` | `--lg-warn`       | `#B54708` |
| `--lg-neg-soft`      | `#FDECEA` | `--lg-warn-soft`  | `#FEF3E8` |
| `--lg-solid`         | `#101828` | `--lg-solid-hover`| `#1D2939` |

Tailwind utilities exist for all of them via `@theme inline`: `bg-canvas`,
`text-ink-3`, `border-line`, `text-pos`, `bg-accent-soft`, and so on.

### 3.3 Elevation and motion

```
--lg-e1 … --lg-e4        four elevation steps, two shadow layers each
--lg-ease-enter          cubic-bezier(0.32, 0.72, 0, 1)   — arriving
--lg-ease-exit           cubic-bezier(0.4, 0, 0.6, 1)     — leaving
--lg-fast 160ms  --lg-base 240ms  --lg-slow 340ms
```

Rules: animate `transform` and `opacity` only, so it runs on the compositor.
Every animation is disabled under `prefers-reduced-motion: reduce` — the media
query block at the end of `foundation.css` must be extended when you add one.

### 3.4 Type scale

`.t-hero` `.t-title` `.t-card` `.t-body` `.t-meta` `.t-eyebrow`, plus `.num` for
tabular figures. **Every amount, percentage, count and date gets `.num`.**
Never set a font size below 12px. Never use `em` for font size — it resolves
against the inherited size, which caused a 7px-text bug in this codebase already.

### 3.5 Primitives — use these, do not invent

| Class | Use |
| ----- | --- |
| `.lg-card` | Any panel. Hairline border, no shadow. |
| `.lg-page` / `.lg-page-bottom` | Page gutters + measure cap; safe-area bottom padding. |
| `.lg-btn` + `-solid` `-quiet` `-ghost` `-accent` `-danger` `-sm` `-block` | All buttons. |
| `.lg-iconbtn` | Square icon-only button, 44px tap target. |
| `.lg-row` + `.lg-row-icon` | Tappable list row. |
| `.lg-tile` | Icon-over-label action tile (the quick-action grid). |
| `.lg-tag` / `.lg-tag-pos` | Small status or delta badge. |
| `.lg-track` | Progress bar. It is `display: block` — do not remove that. |
| `.lg-seg` | Segmented tab strip inside a screen. |
| `.lg-label` `.lg-input` `.lg-select` `.lg-hint` `.lg-hint-error` | Forms. |
| `.lg-scrim` / `.lg-sheet` / `.lg-sheet-grip` | Modal scrim and sheet. **Use for all 13 modals.** |
| `.lg-drawer-scrim` / `.lg-drawer` / `.lg-stagger` | The phone navigation drawer. |
| `.lg-pop` | Dropdown or popover. Set `--lg-pop-origin: right` to flip the origin. |
| `.lg-sr` | Screen-reader-only text. |

**All of these are declared inside `@layer components`.** If you add a class outside
that layer it will beat Tailwind utilities and break every override. This has already
caused one bug.

---

## 4. Navigation — settled, do not change again

The user rejected a bottom tab bar outright. Navigation is:

- **Phone (`< md`)** — header with a hamburger (`#navbar-menu-button`) → left
  slide-over drawer (`NavigationSidebar`), plus a filled `+` icon button for the
  primary action. The drawer closes on backdrop click, Escape, or picking a section,
  and locks background scroll while open.
- **Desktop (`≥ md`)** — header with the profile switcher and the tools row, and a
  horizontal section nav beneath it. No drawer.

`BottomTabBar` was deleted. Do not reintroduce it.

---

## 5. What is done, what is left

### Done

| File | Note |
| ---- | ---- |
| `src/design/foundation.css` | Tokens, primitives, elevation, motion. |
| `src/design/tokens.ts` | `currencySymbol`, `formatAmount`, `splitAmount`, `formatDayMonth`. |
| `src/index.css`, `index.html` | Foundation import, Satoshi. |
| `src/components/Navbar.tsx` | Full rewrite. Handlers and ids preserved. |
| `src/components/NavigationSidebar.tsx` | Rewritten as the animated slide-over. |
| `src/App.tsx` | Shell layout, footer, version label. |
| `src/pages/Overview.tsx` | Composition only, zero hex literals. |
| `src/components/overview/*` | `BalanceHero`, `SectionCard`, `ActivityList`, `CategorySpend`, `BudgetMonitor`, `VaultList`, `DebtStrip`. |
| `src/version.ts` | `APP_VERSION` — the footer reads this. |

### Left, roughly in order

1. `TransactionsPage` (247 lines), `BudgetsPage` (246), `DebtsPage` (274)
2. `GoalsPage` (712), `HistoryPage` (497), `ReportsPage` (372)
3. `SettingsPage` (1195), `AIAdvisorPage` (1424), `AdminPage` (870)
4. `LandingPage` (1361)
5. `src/components/Modals/` — 13 files, on `.lg-scrim` / `.lg-sheet`
6. `ReceiptRow` and `TicketStubCard` — **shared** by History and Transactions.
   Rebuild them once, then verify both pages.

Do one page per change, verify it, then move on. Do not batch four pages into one
commit; when something regresses you will not know which page did it.

---

## 6. The preview harness — how to actually verify work

`tools/overview-preview/` renders **real screens in the real shell** against fixture
data, with no database, login or API.

```
npm run preview:overview     # → preview-dist/
```

- `preview-dist/index.html` — contact sheet: every registered screen at 390 / 834 /
  1280 px, populated and empty, each in its own `<iframe>`.
- `?screen=overview&state=empty` — one screen at the current viewport.

**Why iframes:** a CSS media query answers to the viewport, not to a container. A
"phone column" inside a desktop page reports desktop breakpoints and hides every
responsive bug there is.

**To add a screen:** register it in the `SCREENS` map in
`tools/overview-preview/main.tsx`. Add fixtures to `fixtures.tsx` if the page needs
data the current stubs do not cover.

Two harness quirks that will waste an hour if you do not know them:

1. **Tailwind v4 source detection** — the harness lives outside `src/`, so
   `preview.css` must keep `@import "../../src/index.css";` and `@source "../../src";`.
   Without the `@source`, only harness classes are generated (45 KB CSS instead of
   ~200 KB) and every screen renders unstyled.
2. **Storage APIs** — the preview is reviewed in a sandboxed iframe where
   `localStorage` is unavailable, and deployment is blocked if the bundle even
   mentions it. `vite.preview.config.ts` therefore has
   `define: { localStorage: '__lgMemStore', sessionStorage: '__lgMemStore' }`, and
   `index.html` installs an in-memory shim. **The shipped app is built by
   `vite.config.ts` and is unaffected.** Do not "fix" app code to satisfy the preview.

### Verification checklist per screen

Nothing is done until all of these pass:

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean
- [ ] Renders at **390 / 834 / 1280 px**, and check **360 px** for the narrowest phones
- [ ] No horizontal scroll: `document.documentElement.scrollWidth <= window.innerWidth`
- [ ] No amount wraps between its symbol and its digits — this bug has occurred twice
- [ ] Every tappable target ≥ 44 px tall
- [ ] Empty state renders and reads as guidance, not as an error
- [ ] Zero is neutral: no green, no `+`, no `↑` on a zero value
- [ ] No text under 12 px, no truncation mid-word, no text on a same-tone background
- [ ] Interactive elements keep a visible focus ring

---

## 7. Known issues and traps

- **Dark mode is currently broken by design.** Tokens are light-only, and rebuilt
  files dropped their `dark:` variants. Rebuilt screens stay light while
  un-rebuilt pages still respond to the toggle. The fix is a `~30`-line dark token
  block in `foundation.css` — the user has been told, and deferred it.
- **`uiStyle` (modern / minimal / slate / editorial)** from `useTheme()` still works
  but now conflicts conceptually with the foundation. Left functional on purpose.
  Do not delete it without asking.
- **Main JS chunk is 2.26 MB.** Known, not addressed. Not a UI-rebuild concern.
- **`VITE_GOOGLE_CLIENT_ID` is baked in at build time** — it must exist before
  `npm run build` or Google sign-in silently breaks in the built bundle.
- Bugs already found and fixed, worth not reintroducing: unlayered classes beating
  Tailwind; `text-[0.42em]` resolving to 7 px; a `.lg-track` without `display: block`
  rendering invisible bars; a `.tag.v` class collision producing 46 px badges; a
  savings rate rounded to a whole number, hiding the fraction the server sends.
- Free Render tier: spins down when idle, resets in-memory rate limits, and drops the
  Gemini live-voice WebSocket.

---

## 8. Prompt for another assistant

Paste this, and attach or point at this repository.

> You are continuing a UI rebuild of **Ledger**, a React 19 + Vite 6 + TypeScript +
> Tailwind v4 personal and business finance app. Read `docs/UI_REBUILD_HANDOFF.md`
> in the repo first and follow it exactly — it defines the design tokens, the
> component primitives, the navigation pattern and the verification process.
>
> **Hard constraint: presentation only.** You may change markup and classes. You may
> not change props, handlers, state, element ids, aria attributes, context usage,
> API calls, calculations, or anything under `server.ts`, `src/api/` or
> `src/context/`. Everything must work exactly as it did before. If you believe you
> have found a logic bug, report it and leave it alone.
>
> **Design direction:** clean, professional, premium, mobile-first — modelled on
> Ghanaian banking apps (Ecobank, MTN MoMo, GCB). One accent colour used only for
> interaction, hairline borders instead of shadows on cards, generous whitespace,
> amounts as the loudest element, no gradients, no glows, no coloured shadows, no 3D
> effects, no decorative illustrations. It must not look AI-generated. Every value
> comes from a token in `src/design/foundation.css`; a rebuilt file contains zero hex
> literals and zero raw pixel font sizes. Reuse the existing `.lg-*` primitives
> instead of writing new CSS, and if you must add a class, put it inside
> `@layer components`.
>
> **Navigation is settled:** hamburger plus a left slide-over drawer on phones, a
> header with a horizontal section nav on desktop. Do not add a bottom tab bar.
>
> **Task:** rebuild the remaining pages listed in §5 of the handoff, one page per
> change, starting with `src/pages/TransactionsPage.tsx`. Use the existing rebuilt
> `src/pages/Overview.tsx` and `src/components/overview/*` as the reference for tone,
> density and structure.
>
> **For each page, before you call it done:** register it in the preview harness
> (`tools/overview-preview/main.tsx`), run `npx tsc --noEmit` and `npm run build`,
> run `npm run preview:overview`, and check it visually at 360, 390, 834 and 1280 px
> against the checklist in §6 of the handoff — including no horizontal overflow, no
> amount wrapping between symbol and digits, 44 px minimum tap targets, a real empty
> state, and zero values rendered neutrally. Report exactly what you verified and
> what you did not. Do not claim a page is finished on the strength of a typecheck.
>
> Do not commit `package-lock.json`; this repo uses `bun.lock`.

---

## 9. Environment notes

- GitHub repo `nisaco/Finance_Manager` (private). Work branch
  `chore/render-auto-deploy`, open as PR #1.
- Render deploys from `render.yaml` as a single free service (Blueprint → select the
  repo → pick the branch, or merge to `main` first).
- Earlier non-UI fixes already on this branch: the server now honours `PORT`, and the
  rate-limit bucket no longer collapses every client into one key behind a proxy.

---

## Round 2 — progress bars removed, three pages rebuilt (commit e6bfaac)

The user rejected progress bars outright: "You see all those apps I gave you to
reference didn't have those." The rule is now absolute — **a bar is never an
acceptable way to show a proportion in this app.** State the figure instead.
`.lg-track` still exists in `foundation.css` but has zero callers; delete it if
nothing needs it by the end of the rebuild.

What each screen says now instead of drawing a bar:

| Was a bar | Now reads |
| --- | --- |
| Savings rate (BalanceHero) | "You kept 29.2% of what came in this month." |
| Category spend | a ranked list, amount + "N% of spend" |
| Budget usage (Overview + Budgets) | "GH₵ 300.00 left" / "GH₵ 340.00 over", plus Used N% |
| Goal funding (VaultList) | "GH₵ 6,200.00 of 10,000.00 · 62% funded" |
| Debt settled | "Still outstanding GH₵ 2,000.00", "Settled so far GH₵ 400.00 · 17%" |

### Rebuilt this round

`src/pages/TransactionsPage.tsx`, `src/pages/BudgetsPage.tsx`,
`src/pages/DebtsPage.tsx`. All three are registered in the preview harness —
open `?screen=transactions|budgets|debts`, add `&state=empty` for the empty
state.

### Bugs found and fixed while rebuilding

1. **`dateTo` was unreachable.** TransactionsPage held `dateTo` state and
   filtered on it, but rendered only a "from" input. There is now a "To" input.
2. **Negative totals rendered as positive.** `formatCurrency()` in
   `src/design/tokens.ts` runs `Math.abs()` internally, so a negative net
   printed as a positive figure distinguished only by its colour. The shared
   formatter was left alone (every other caller depends on its output); a local
   `signed()` helper in TransactionsPage prepends `+` / `−` and leaves zero
   unsigned. **Any other screen that prints a signed total has this same bug —
   check it when you rebuild that screen.**
3. **Totals truncated at 390px.** Three columns of currency ellipsised; they
   stack as labelled rows below `sm`.
4. **`xs:` variants were dead.** No `xs` breakpoint exists in this Tailwind v4
   setup, so `hidden xs:inline` meant permanently hidden. Replaced with `sm:`.
5. **`.lg-seg` buttons were 34px tall** — under the tap-target floor. Now 40px,
   which with the 3px container padding clears 44px.

### Verified

`npx tsc --noEmit` and `npm run build` clean. All three screens inspected in a
real browser at 360 / 390 / 834 / 1280 px: no horizontal overflow, no clipped
text apart from the deliberate category-name ellipsis in `ReceiptRow`, empty
states render.

### Known, not yet fixed

- `ReceiptRow` (shared with HistoryPage) is still the old design and contains
  10px text, below the 12px floor. Rebuild it once and verify both pages.
- `.t-eyebrow` is 11px. Consistent across the app, but under the stated floor.
- Dark mode is still broken on rebuilt screens; tokens are light-only.
