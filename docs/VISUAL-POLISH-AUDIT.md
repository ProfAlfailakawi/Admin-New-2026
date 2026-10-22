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
