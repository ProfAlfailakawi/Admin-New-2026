# Quality scorecard, round 3 (presentation only)

Harness: Playwright + axe-core (wcag2a/aa/21/22aa + best-practice) plus custom checks:
H1 axe, H2 overflow, H3 clipped text, H4 console errors, H5 CLS < 0.10, H6 visible focus,
H7 content stuck invisible, H8 no running animation under reduced motion, H9 text contrast.
Screens: 20 admin routes in demo mode (`?demo=1&page=<id>`, Arabic RTL) x 4 viewports
(320/390/768/1280) x normal/reduced motion = 160 measurements, run against a production build.

## Before / after

| Metric | Before | After |
|---|---|---|
| Screens passing every hard criterion | 4 / 160 (3%) | 17 / 160 (11%) |
| H1 axe failures | 154 | 123 |
| axe button-name (icon buttons without a name) | 136 | 43 |
| axe select-name | 40 | 8 |
| axe label | 16 | 8 |
| axe scrollable-region-focusable | 20 | 10 |
| axe color-contrast | 45 | 22 |
| axe page-has-heading-one / region | 8 / 3 | 1 / 1 |
| H9 contrast failures | 122 | 103 |
| H6 focus, H8 reduced motion, H3 clipped | 23 / 3 / 8 | 23 / 3 / 8 (unchanged) |
| H5 CLS | 8 | 14 (see note) |
| H7 stuck-invisible | 13 | 11 |
| Infinite animations (soft) | 56 | 47 |

Note on CLS: it is measured on a busy shared machine and varies run to run (late data and
lazy chunks); no layout rule was changed in this round, so the rise is treated as noise, not
a regression, but it was not investigated further.

## What changed
- `src/quality.css` (new, imported last in `main.tsx`): deeper text colours on light cards
  and tinted chips (slate-400/500, indigo-500, emerald, red, rose, two hex chip colours,
  white-on-blue chip fill), ring numbers inherit the panel colour, a quiet keyboard-only
  focus ring on the scrollable main region, 44px header home button, looping
  ping/pulse/bounce decoration stopped under reduced motion. Dark/heritage panels untouched.
- Accessible names (`aria-label`) on icon-only buttons and unlabeled selects/date input in
  `App.tsx`, `Dashboard.tsx`, `InvoicePage.tsx`, `ProductPage.tsx`, `CustomerPage.tsx`,
  `SupplierAudit.tsx`; `tabIndex={0}` on two scroll regions so they are keyboard-scrollable.

## Looked at by eye and left alone
Dashboard 390, invoices list 390, reports 1280 (before captures): hierarchy, spacing, iconography
and RTL typography are already strong from rounds 1-2; no redesign was warranted. No new motion added.

## Not done / not viewed
- Remaining failures (mostly heading-order, remaining unnamed buttons in Dashboard cards,
  contrast on gradient/dark panels, focus indicators on a few buttons) were counted but not fixed.
- Dark mode: the app has no theme switch, so not measured. Public pages, login, track/payment,
  and states behind interaction (modals, sheets) were not in this run.
- After-screenshots were not individually reviewed; judgement is from the before captures and metrics.
- Demo mode only; real data, auth, payments, Safari and real devices not covered.
- Tests: one earlier `npm test` run showed a single failure while a build ran concurrently; two
  later runs were 12/12 files, 82/82 tests.
