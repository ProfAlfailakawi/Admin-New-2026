# Visual polish audit

Scope: visual layer only. No logic, data, routes, rules or tests were touched.
Method: demo mode (`?demo=1&page=<id>`) rendered with Chromium at 390px and 1280px;
horizontal overflow measured per screen (0px everywhere that was captured).

## Admin screens (shared hero in `AdminExperienceFrame`, `src/App.tsx`)
Audited: dashboard, new-invoice, invoices-list, orders, customers, products, expenses,
suppliers, suppliers-audit, reports, ai, smart-studio, loyalty, coupons, growth-simulator,
profit-guard, diwaniya, whatsapp-support, settings (19 routes) + the shared header,
sidebar, bottom toasts, empty state and skeleton.

Findings
- Hero subtitles (`getAdminPageMeta`, App.tsx ~1310-1330) were long sentences and some
  were internal design-brief wording shown to the owner ("بدون لمس منطق التراث الذكي",
  "بدون صراخ بصري", "بطاقات هادئة", "سجل فخم", "لوحة بطولات ناعمة").
- Hero had no visual anchor: kicker + title + sentence, three text lines on phones, and
  the kicker largely repeats the title.
- `SmartEmptyState.tsx`: looping `animate-pulse` on the halo and on the action button
  (noise, ignores reduced motion).

Changes
- Subtitles shortened to one short phrase each (16 entries), brief-wording removed.
  Every string was grepped first: no test, script or guard references them.
- New `src/components/ui/PageHeroIcon.tsx`: one decorative (aria-hidden) lucide icon per
  page in a gold tile (same tile language as the existing accordion icons). Title stays the
  accessible name; no data is shown.
- `beauty-pass.css`: hero becomes icon + text column; on phones (<=520px) the kicker is
  hidden so the hero is title + one line.
- `SmartEmptyState.tsx`: removed the two infinite pulse animations.

## Left alone on purpose
Dashboard, order/invoice cards, tables, charts, settings, studio, WhatsApp inbox,
public pages (track / success / failed / login): already iconised, tiered and tested in
earlier passes (r23/r41/r52, dna/ledger.css); further edits would risk behavior or
the existing guards for little gain. Slim strip under the hero (title + "فتح") kept: it is
the toggle for the smart panel. The dark/heritage panels keep their palette.

## Not verified
Real data, auth, payments, push and server paths (demo mode only); Safari/real devices.

---

# Round 2: motion system and quiet elevation

Scope: presentation only. New layer `src/motion.css`, imported last in `src/main.tsx`
(after `ledger.css`), built on the existing DNA/ledger layers; nothing there was
duplicated or overridden except the older `bp-rise` entrance, which it replaces with the
shared tokens. No logic, data, routes, rules, tests, dependencies or workflows changed.

## Token set (`:root` in `motion.css`)
`--mo-ease: cubic-bezier(.2,.7,.2,1)`, `--mo-fast: 120ms`, `--mo-base: 180ms`,
`--mo-slow: 260ms`, `--mo-step: 40ms` (stagger, capped at 8 steps), `--mo-lift-shadow`.

## Motion inventory
All of it is inside `@media (prefers-reduced-motion: no-preference)`, uses `backwards`
fill (the resting state is the unchanged static design), animates transform/opacity only
(plus `translate`/`scale` properties for hover/press), runs once, never loops.

| What | Trigger | Duration |
| --- | --- | --- |
| Page hero rise, icon tile pop, text fade | mount | 260ms |
| Screen blocks (`.admin-content-polish > * > *`) fade + rise 8px, stagger 40ms, max 8 | mount | 260ms |
| Tiles/cards (`bp-kpi`, `bp-statcard`, `order-card-hl`, `dna-stat`, bento, lab tool) fade + rise 6px, stagger | mount | 260ms |
| Dashboard tab panel cross-fade | tab change (panel remounts) | 260ms |
| Settings accordion open (`.bp-acc` body) | section opens | 180ms |
| `MiniBar` fills and the new donut share bars grow with `scaleX` to the real width | mount | 260ms |
| Donut legend rows fade + rise, stagger | mount | 180ms |
| Active sidebar item: brass tick grows (`scaleY`) | item becomes current | 260ms |
| Empty state (`.dna-void`) settles in | mount | 260ms |
| Hover lift (`translate: 0 -1px` + soft shadow) on KPI/order/stat/bento cards, nav icon nudge | pointer hover, fine pointers only | 120-180ms |
| Press feedback `scale: .98` (zero specificity, existing `active:scale-*` still wins) | `:active` | instant |

Not animated on purpose: the invoice builder (`data-page="new-invoice"` is excluded from
the entrance rules), table rows, form inputs, amounts, long text, Quran/exam/answer
screens. Existing DNA count-up, ring/spark draw-in, journey steps, framer modals and
toasts were left as they are. Existing loading skeleton shimmer and spinners untouched.
Under `reduce`, every rule above is cancelled (`animation:none; transition:none`) and the
older global rule in `ledger.css` keeps shortening the rest.

## Presentation changes
- `DnaDonut.tsx`: each legend row gets a thin share bar (its real value / total, decorative,
  `aria-hidden`), so the expense/payment-method donuts read as a ranked infographic.
  Reused by every donut. Colour = the slice's own tone.
- `App.tsx`: `data-page={page}` on `.admin-content-polish` (CSS hook only).
- `ProductPage.tsx`: two accordion sub-lines cut to a few words (grepped: no test or guard
  references them).
- Active nav gets a brass tick (CSS pseudo-element).

## Left alone and why
Order/invoice/payment/notification/role surfaces: only the generic card entrance and hover
lift apply to them, no markup touched. Dashboard internals (6k lines), tables, charts,
studio, WhatsApp inbox, public pages: already iconised and covered by earlier guards.
Loyalty/coupons still embed the dashboard command header under the page hero (a
structural duplicate); removing it would remove tab navigation, so it stays.
Focus-ring ease-in was not added: the ring is declared `!important` in `ledger.css` and the
only animatable parts (outline/box-shadow colour) are not transform/opacity.

## Not verified
Real data, auth, payments, push (demo mode only); Safari and real devices; modal/drawer
in-out motion (still the existing framer config, not changed or re-measured); error and
loading-failure screens that demo mode cannot reach; screenshots of invoices-list,
suppliers-audit and reports could not be captured reliably on the loaded machine (the
Playwright screenshot timed out or caught the skeleton), overflow was still measured 0px.
