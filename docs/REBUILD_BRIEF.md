# Per-page rebuild brief (shared by the page rebuild agents)

Read `docs/UI_REBUILD_HANDOFF.md` first — it has the full token table, the
primitives list and the verification checklist. This file is the short version
plus the things specific to this round.

## Absolute constraint

**Presentation only.** Do not change props, handlers, state, element ids, aria
attributes, context usage, API calls or any calculation. Do not touch
`server.ts`, `src/api/`, or `src/context/`. If you think you found a logic bug,
write it in your report and leave the code alone.

## Design rules

- Every value comes from a token in `src/design/foundation.css`. A finished file
  has **zero hex literals and zero raw pixel font sizes**.
- Reuse the `.lg-*` primitives. Do not write new CSS. If you genuinely need a new
  class you must put it inside `@layer components` — but prefer not to.
- **No progress bars.** The user explicitly rejected them; `.lg-track` has been
  removed from every Overview component. State the number instead: "GH₵ 300 left",
  "62% funded", a rank, a remainder. If you are tempted to draw a bar, print the
  figure it would have represented.
- No gradients, glows, coloured shadows, 3D effects or decorative illustrations.
- One accent colour, interaction only. Hairline borders on cards, not shadows.
- Mobile-first. Reference points are Ecobank, MTN MoMo and GCB: stacked cards,
  list rows with a title, small meta and a right-aligned coloured amount,
  segmented tab strips (`.lg-seg`) inside a screen, generous whitespace.
- Icons: `strokeWidth={1.7}`, never filled.
- Every amount, percentage, count and date gets the `.num` class.
- Zero is neutral — never green, never `+`, never `↑`.
- Empty, loading and error states are first-class. An empty card explains the
  next action rather than reading like a failure.

## Reference implementation

Study `src/pages/Overview.tsx` and `src/components/overview/*` — especially
`ActivityList.tsx` (list rows), `SectionCard.tsx` (card + header + action) and
`BudgetMonitor.tsx` (a list that used to have bars and no longer does). Match
that tone, density and structure. Reuse `SectionCard` where it fits.

## Verification — nothing is done until all of this passes

Your page is already registered in the preview harness, so:

```
npx tsc --noEmit          # must be clean
npm run build             # must be clean
npm run preview:overview  # builds preview-dist/
```

Then look at it. Do not claim a page works on the strength of a typecheck.

Deploy and inspect with the browser:

1. `npm run preview:overview`
2. Ask the parent for a deploy, or if you can deploy yourself use
   `pplx-tool deploy_website` with `project_path=/home/user/workspace/fm/preview-dist`.
3. Open `<url>?screen=<yourscreen>` in a cloud browser, set the viewport with
   `cdp("Emulation.setDeviceMetricsOverride", {...})` and screenshot.

Check at **360, 390, 834 and 1280 px**:

- [ ] No horizontal scroll: `document.documentElement.scrollWidth <= window.innerWidth`
- [ ] No amount wraps between its currency symbol and its digits
- [ ] Every tappable target ≥ 44px tall
- [ ] Empty state renders (`?screen=<x>&state=empty`) and reads as guidance
- [ ] No text under 12px, no mid-word truncation, no same-tone text on background
- [ ] Focus rings visible on interactive elements

## Housekeeping

- Do **not** run `git commit` or `git push`. The parent commits.
- Do **not** delete `package-lock.json` concerns aside, do not commit it.
- Other agents are editing other pages in the same checkout at the same time.
  **Only touch your own page file** and any component used solely by it. Do not
  edit `foundation.css`, `main.tsx`, `fixtures.tsx`, `App.tsx` or `Navbar.tsx`.
  If you need something from one of those, report it instead of editing.

## Report back

In your final message, plain text, no files:

1. What you changed, briefly.
2. The widths you actually viewed and what you saw.
3. Anything you could not verify.
4. Any logic bug you found and left alone.
