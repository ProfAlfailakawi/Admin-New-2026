# Alturath Admin System — لوحة إدارة التراث

The operations and admin console for Alturath (مطبخ التراث): invoices and point of sale, website/app orders and online payments, customers, products, suppliers, expenses, executive reports, loyalty and offers, diwaniya tournaments, a WhatsApp support centre, push alerts, and AI marketing tools. It is a React + Vite single-page app served next to an Express API (`server.ts`) on Firebase Hosting + Cloud Run, with Firestore as the data store.

This is the **admin** app. The customer-facing ordering app is a separate repository (Order-New-2026).

- Live console: **https://admin.alturathkw.shop**
- Firebase Hosting default domain: https://alturath-admin-0200723670.web.app
- No-account demo: https://admin.alturathkw.shop/?demo=1 (see [Demo mode](#demo-mode-presentations))

[![CI](https://github.com/ProfAlfailakawi/Admin-New-2026/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![Deploy watchdog](https://github.com/ProfAlfailakawi/Admin-New-2026/actions/workflows/deploy-watchdog.yml/badge.svg)](.github/workflows/deploy-watchdog.yml)
[![Alerts tick](https://github.com/ProfAlfailakawi/Admin-New-2026/actions/workflows/alerts-tick.yml/badge.svg)](.github/workflows/alerts-tick.yml)

---

## Feature map / خريطة الميزات

Inside the console, screens are switched in app state (`currentPage` in [src/App.tsx](src/App.tsx)), not by URL. The only real URL routes are the public pages (`/track`, `/success`, `/failed`, `/cancel`, `/error`, `/invoice/<id>`). For the console screens, the "Live link" column gives the demo deep link (`?demo=1&page=<id>`), which opens that screen with sample data. A signed-in account always starts on the command centre (notification deep links can open the invoice ledger or the WhatsApp inbox directly).

Status: **يعمل** = wired into the live app. **تجريبي** = present in code but partial, not mounted, or not released.

### Console screens (admin)

| الميزة / Feature | ما تفعله / What it does | الرابط المباشر / Live link | الشيفرة / Code | الحالة |
|---|---|---|---|---|
| مركز القيادة — Command centre | Daily pulse: today's sales, pending and failed payments, quick actions; tabs for intelligence, financials, customers, suppliers, growth | [`?demo=1&page=dashboard`](https://admin.alturathkw.shop/?demo=1&page=dashboard) | [src/components/Dashboard.tsx](src/components/Dashboard.tsx), [src/components/DashboardFeatures.tsx](src/components/DashboardFeatures.tsx), [src/components/CommandBrief.tsx](src/components/CommandBrief.tsx) | يعمل |
| مختبر التراث الذكي — Smart lab | The command centre opened on its "intelligence" tab (decisions, learning, risks, strategy) | [`?demo=1&page=dashboard-ai`](https://admin.alturathkw.shop/?demo=1&page=dashboard-ai) | [src/components/Dashboard.tsx](src/components/Dashboard.tsx), [src/lib/ai-engine.ts](src/lib/ai-engine.ts) | يعمل |
| فاتورة جديدة — New invoice | Create or edit a sale: customer, items, add-ons, delivery slot, summary, payment link | [`?demo=1&page=new-invoice`](https://admin.alturathkw.shop/?demo=1&page=new-invoice) | [src/components/InvoicePage.tsx](src/components/InvoicePage.tsx), [src/lib/invoice-calculations.ts](src/lib/invoice-calculations.ts) | يعمل |
| سجل الفواتير — Invoice ledger | Search, review, print and share invoices; second tab lists app orders; delete honours both invoice sources | [`?demo=1&page=invoices-list`](https://admin.alturathkw.shop/?demo=1&page=invoices-list) | [src/components/ReportsPage.tsx](src/components/ReportsPage.tsx), [src/lib/invoiceDeletion.ts](src/lib/invoiceDeletion.ts), [src/lib/printUtils.ts](src/lib/printUtils.ts), [src/utils/invoiceShare.ts](src/utils/invoiceShare.ts) | يعمل |
| طلبات الموقع — Website/app orders | Live board of orders from the customer app: payment state, delivery, status changes | [`?demo=1&page=orders`](https://admin.alturathkw.shop/?demo=1&page=orders) | [src/components/OrderPage.tsx](src/components/OrderPage.tsx), [src/lib/status-utils.ts](src/lib/status-utils.ts) | يعمل |
| لوحة العملاء — Customers | Top, new and lapsed customers; contact data and ranking | [`?demo=1&page=customers`](https://admin.alturathkw.shop/?demo=1&page=customers) | [src/components/CustomerPage.tsx](src/components/CustomerPage.tsx), [src/lib/name-matching.ts](src/lib/name-matching.ts) | يعمل |
| قائمة المنتجات — Products | Product catalogue, prices, availability and a product strength index | [`?demo=1&page=products`](https://admin.alturathkw.shop/?demo=1&page=products) | [src/components/ProductPage.tsx](src/components/ProductPage.tsx), [src/components/ProductQualityBoard.tsx](src/components/ProductQualityBoard.tsx) | يعمل |
| المصروفات — Expenses | Record expenses and payments by category | [`?demo=1&page=expenses`](https://admin.alturathkw.shop/?demo=1&page=expenses) | [src/components/ExpensePage.tsx](src/components/ExpensePage.tsx) | يعمل |
| الموردون — Suppliers | Supplier balances, supply and payment records, risk radar | [`?demo=1&page=suppliers`](https://admin.alturathkw.shop/?demo=1&page=suppliers) | [src/components/SupplierPage.tsx](src/components/SupplierPage.tsx), [src/components/SupplierNegotiator.tsx](src/components/SupplierNegotiator.tsx) | يعمل |
| كشف حساب المورد — Supplier audit | Detailed statement per supplier: supply, payments, effect on profit | [`?demo=1&page=suppliers-audit`](https://admin.alturathkw.shop/?demo=1&page=suppliers-audit) | [src/components/SupplierAudit.tsx](src/components/SupplierAudit.tsx) | يعمل |
| التقارير التنفيذية — Reports | Executive reading of invoices, sales and performance | [`?demo=1&page=reports`](https://admin.alturathkw.shop/?demo=1&page=reports) | [src/components/ReportsPage.tsx](src/components/ReportsPage.tsx), [src/components/ReportsInsights.tsx](src/components/ReportsInsights.tsx), [src/components/DashboardCharts.tsx](src/components/DashboardCharts.tsx) | يعمل |
| المالية وحماية الأرباح — Profit guard | Sales vs. expenses, margin and opportunities | [`?demo=1&page=profit-guard`](https://admin.alturathkw.shop/?demo=1&page=profit-guard) | [src/components/RealProfitGuard.tsx](src/components/RealProfitGuard.tsx), [src/lib/business-logic.ts](src/lib/business-logic.ts) | يعمل |
| محاكي النمو — Growth simulator | "What if" scenarios for sales, profit and risk | [`?demo=1&page=growth-simulator`](https://admin.alturathkw.shop/?demo=1&page=growth-simulator) | [src/components/WhatIfSimulator.tsx](src/components/WhatIfSimulator.tsx) | يعمل |
| الولاء — Loyalty | Customer tiers, golden points, badges and upgrades (rendered as the command centre "rewards" tab) | [`?demo=1&page=loyalty`](https://admin.alturathkw.shop/?demo=1&page=loyalty) | [src/components/LoyaltyProgramPage.tsx](src/components/LoyaltyProgramPage.tsx), [src/components/VIPMissions.tsx](src/components/VIPMissions.tsx) | يعمل |
| العروض — Coupons/offers | Promo codes, usage and profit impact per coupon | [`?demo=1&page=coupons`](https://admin.alturathkw.shop/?demo=1&page=coupons) | [src/components/PromoCodePage.tsx](src/components/PromoCodePage.tsx), [src/components/SmartOffersCalculator.tsx](src/components/SmartOffersCalculator.tsx) | يعمل |
| بطولات الديوانية — Diwaniya tournaments | Diwaniya leaderboard, points, prizes and a Kuwait radar map | [`?demo=1&page=diwaniya`](https://admin.alturathkw.shop/?demo=1&page=diwaniya) | [src/components/DiwaniyaTournaments.tsx](src/components/DiwaniyaTournaments.tsx), [src/lib/kuwait-map-projection.ts](src/lib/kuwait-map-projection.ts) | يعمل |
| مستشار التراث الذكي — AI assistant | Chat assistant over the business data (Gemini on the server) | [`?demo=1&page=ai`](https://admin.alturathkw.shop/?demo=1&page=ai) | [src/components/AIAssistant.tsx](src/components/AIAssistant.tsx), [server.ts `/api/ai/assistant`](server.ts#L10880) | يعمل (needs `GEMINI_API_KEY`) |
| استوديو التراث الذكي — Smart content studio | Pick content, generate images/reels/captions, preview, archive; quality and "reality" audits; requires a signed-in console session | [`?demo=1&page=smart-studio`](https://admin.alturathkw.shop/?demo=1&page=smart-studio) | [src/components/SmartContentStudio.tsx](src/components/SmartContentStudio.tsx), [src/lib/alturathStudioBrain.ts](src/lib/alturathStudioBrain.ts), [server.ts `/api/smart-studio/*`](server.ts#L11601) | يعمل (needs `GEMINI_API_KEY`) |
| مركز واتساب الذكي — WhatsApp centre | Inbox of customer conversations, replies, quick/auto replies, bot texts, diagnostics; inbox polls only changed conversations | [`?demo=1&page=whatsapp-support`](https://admin.alturathkw.shop/?demo=1&page=whatsapp-support) | [src/components/WhatsAppSupportInbox.tsx](src/components/WhatsAppSupportInbox.tsx), [src/utils/whatsappConversationsDelta.ts](src/utils/whatsappConversationsDelta.ts), [docs/WHATSAPP_OPERATIONS_AR.md](docs/WHATSAPP_OPERATIONS_AR.md) | يعمل (transport set by `WHATSAPP_TRANSPORT`) |
| الإعدادات العامة — Settings | Branding, operations, delivery, partners, push devices, cloud import, Excel backup export | [`?demo=1&page=settings`](https://admin.alturathkw.shop/?demo=1&page=settings) | [src/components/GeneralSettings.tsx](src/components/GeneralSettings.tsx) | يعمل |

### Shell, alerts and floating tools

| الميزة / Feature | ما تفعله / What it does | الرابط المباشر / Live link | الشيفرة / Code | الحالة |
|---|---|---|---|---|
| تسجيل الدخول والأدوار — Sign-in and roles | Google sign-in against an allow-list; `admin` gets the full console, `partner` gets the partner dashboard (orders, invoices, AI, studio). Other roles in the role matrix (employee, kitchen, accountant) are defined as flags only | https://admin.alturathkw.shop/ | [src/components/Login.tsx](src/components/Login.tsx), [src/lib/roleMatrix.ts](src/lib/roleMatrix.ts), [src/components/PartnerDashboard.tsx](src/components/PartnerDashboard.tsx) | يعمل (extra roles: تجريبي) |
| إشعارات الدفع — Push alerts | New-order and "not paid after 10 / 30 minutes" alerts to admin devices, deduplicated; a scheduled tick runs the alerts pass while Cloud Run is idle | — | [src/lib/pushNotifications.ts](src/lib/pushNotifications.ts), [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js), [src/components/EnableNotificationsButton.tsx](src/components/EnableNotificationsButton.tsx), [server.ts `/api/push/alerts-tick`](server.ts#L10735) | يعمل |
| تنبيهات استباقية ونبض النظام — Proactive alerts and pulse orb | Floating alerts panel and a status orb that reflects pending/failed payments | — | [src/components/ProactiveAlerts.tsx](src/components/ProactiveAlerts.tsx), [src/components/SystemPulseOrb.tsx](src/components/SystemPulseOrb.tsx), [src/lib/faviconStatus.ts](src/lib/faviconStatus.ts) | يعمل |
| شريط الأوامر — Command bar | Search/jump across screens and records | — | [src/components/CommandBar.tsx](src/components/CommandBar.tsx) | يعمل |
| عصا إنستغرام — Instagram magic wand | Floating caption/post helper on the command centre pulse and the partner dashboard | — | [src/components/InstagramMagicWand.tsx](src/components/InstagramMagicWand.tsx), [src/lib/instagram-studio.ts](src/lib/instagram-studio.ts) | يعمل |
| تثبيت التطبيق (PWA) — Install prompt | Install chip/sheet for the home-screen app; manifest and icons guarded at build time | — | [src/components/InstallPrompt.tsx](src/components/InstallPrompt.tsx), [public/manifest.json](public/manifest.json), [scripts/verify-pwa.mjs](scripts/verify-pwa.mjs) | يعمل |
| التحديث الذاتي وصفحة «نُحدّث البرنامج» — Self-update and updating page | Build id is compared with `/api/version`; during a deploy a calm "updating" page replaces Google's 5xx page | [/updating.html](https://admin.alturathkw.shop/updating.html) | [src/lib/app-update.ts](src/lib/app-update.ts), [src/lib/updatingNotice.ts](src/lib/updatingNotice.ts), [public/updating.html](public/updating.html), [scripts/build-stamp.mjs](scripts/build-stamp.mjs) | يعمل |
| مستشعر ORBIT — Browser error sensor | Sends anonymous browser error notes (no query strings or typed text) to the ORBIT monitor | — | [public/orbit-sensor.js](public/orbit-sensor.js) | يعمل |
| وضع العرض — Demo mode | No-account demo from the sign-in screen or `?demo=1`; Firebase and `/api` are blocked by a fail-closed network guard and answered locally | [`/?demo=1`](https://admin.alturathkw.shop/?demo=1) | [src/lib/demoMode.ts](src/lib/demoMode.ts), [src/lib/demoApi.ts](src/lib/demoApi.ts), [src/lib/demoAi.ts](src/lib/demoAi.ts), [src/demoData.ts](src/demoData.ts), [src/components/DemoBanner.tsx](src/components/DemoBanner.tsx) | يعمل |

### Public pages and integrations

| الميزة / Feature | ما تفعله / What it does | الرابط المباشر / Live link | الشيفرة / Code | الحالة |
|---|---|---|---|---|
| تتبع الطلب — Order tracking | Public page where a customer looks up an order | [/track](https://admin.alturathkw.shop/track) | [src/components/TrackPage.tsx](src/components/TrackPage.tsx) | يعمل |
| نتيجة الدفع — Payment result | Landing pages after UPayments checkout; confirm the invoice, then go to /track | [/success](https://admin.alturathkw.shop/success), [/failed](https://admin.alturathkw.shop/failed) | [src/App.tsx](src/App.tsx) (`PaymentFeedbackView`), [server.ts `/api/invoice/confirm`](server.ts#L10152) | يعمل |
| بوابة الدفع UPayments — Payments | Create payment links and process gateway webhooks with bounded retries | — | [server.ts `/api/create-payment`](server.ts#L9892), [server.ts `/api/webhook/upayments`](server.ts#L7312), [src/lib/paymentWebhookRetry.ts](src/lib/paymentWebhookRetry.ts) | يعمل (needs `UPAYMENTS_API_KEY`) |
| سياسة الخصوصية — Privacy policy | Static privacy page, intentionally not linked from the UI | [/privacy-policy.html](https://admin.alturathkw.shop/privacy-policy.html) | [public/privacy-policy.html](public/privacy-policy.html) | يعمل |
| جسر واتساب للماك — WhatsApp web bridge | Optional Mac process that links a WhatsApp device to the server (legacy `web_bridge` transport) and reports a heartbeat | — | [whatsapp-web-bridge/index.mjs](whatsapp-web-bridge/index.mjs), [whatsapp-web-bridge/README_AR.md](whatsapp-web-bridge/README_AR.md) | تجريبي (legacy path) |
| تطبيق آبل — iOS/iPadOS/Mac shell | Capacitor native shell, store metadata and release script; not part of the web build | — | [apple/capacitor.config.json](apple/capacitor.config.json), [apple/apple-release.sh](apple/apple-release.sh), [apple-release/checklists/release.md](apple-release/checklists/release.md) | تجريبي (not yet submitted to the App Store) |
| مساعد الرئيس التنفيذي — CEO copilot | Explain metrics, draft WhatsApp messages, supplier intel, campaign flow. Server endpoints exist; the unmounted UI component was removed | — | [src/lib/ceo-copilot.ts](src/lib/ceo-copilot.ts), [server.ts `/api/ai/ceo-copilot/*`](server.ts#L11088) | تجريبي (not reachable from the UI) |

Server routes that are stubs today: `GET /api/search-order/:phone` always returns `[]` ([server.ts](server.ts#L10148)) and `GET /api/invoice/:id` always returns 503 ([server.ts](server.ts#L10213)).

---

## Architecture

- **Front end:** React 19 + Vite 6 + Tailwind 4, Arabic RTL. Entry [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx) (shell, auth, data sync, page switch). Screens in [src/components](src/components), helpers in [src/lib](src/lib), styles in [src/index.css](src/index.css) and [src/components/dna](src/components/dna).
- **API:** Express 5 in one file, [server.ts](server.ts), with Helmet, compression and a rate limiter on `/api/`. In development it mounts Vite as middleware; in production it serves `dist/`.
- **Data:** Firestore via the client SDK ([src/firebase.ts](src/firebase.ts), sharded storage in [src/lib/firestoreShardStorage.ts](src/lib/firestoreShardStorage.ts)) and Firebase Admin on the server. Rules: [firestore.rules](firestore.rules), [storage.rules](storage.rules).
- **Hosting:** Firebase Hosting serves the SPA; `/api/**` and `/run-alerts` are rewritten to the Cloud Run service `service` in `europe-west3` ([firebase.json](firebase.json)).

Key server endpoints:

| Endpoint | Purpose |
|---|---|
| [`GET /api/health`](server.ts#L6698), [`GET /api/version`](server.ts#L5462) | Liveness and current build id |
| [`GET /api/appdata/full`](server.ts#L6816) | Full app data for a signed-in console session |
| [`GET /api/admin-dashboard-data`](server.ts#L6892) | Diwaniya leaderboard and shared orders (phones blanked for callers without a console session) |
| [`POST /api/create-payment`](server.ts#L9892), [`POST /api/webhook/upayments`](server.ts#L7312) | UPayments checkout and webhook |
| [`POST /api/push/save-token`](server.ts#L8625), [`GET /api/push/alerts-tick`](server.ts#L10735) | Push device registration and the scheduled alerts pass |
| [`/api/whatsapp/*`](server.ts#L4959) | WhatsApp centre; console session required except the Meta/Kapso webhooks, the bridge and `/health` |
| [`POST /api/ai/*`](server.ts#L10778), [`POST /api/smart-studio/*`](server.ts#L11601) | Gemini features; console session required |

Other folders: [scripts](scripts) (build guards and build stamp), [public](public) (static assets, service worker, updating page), [apple](apple) and [apple-release](apple-release) (native shell), [whatsapp-web-bridge](whatsapp-web-bridge), [docs](docs) (operations notes, quality scorecard, older change notes in [docs/changelog](docs/changelog)).

## Setup and Installation

1. Clone the repository.
2. Install dependencies with `npm ci` (deterministic install).
3. Environment variables: create a `.env` file in the root directory. Variables read by the code include:
   - `VITE_FIREBASE_API_KEY`: Firebase API key
   - `UPAYMENTS_API_KEY`: UPayments gateway key
   - `ADMIN_TEST_SECRET`: secret for internal/debug endpoints
   - `GEMINI_API_KEY`: Gemini API key (AI features)
   - `WHATSAPP_TRANSPORT` and the matching WhatsApp/Kapso/bridge secrets (see [docs/WHATSAPP_OPERATIONS_AR.md](docs/WHATSAPP_OPERATIONS_AR.md))
   - `ENABLE_INTERNAL_ALERTS_RUNNER`: set to `false` to disable the in-process alerts timer
   - `NODE_ENV`: `development` or `production`
   - `PORT`: the port the server listens on (e.g. 3000 or 8080)
   - `FRONTEND_URL`: used to restrict CORS origins
4. Firebase configuration: [firebase-applet-config.json](firebase-applet-config.json) must point to the correct Firebase project and Firestore database. Server-side features (push workers, admin data) need service-account credentials, provisioned securely and never committed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start `server.ts` with tsx; Vite runs as middleware (http://localhost:3000 by default) |
| `npm run build` | PWA guard + demo-entry guard, then `vite build` into `dist/` |
| `npm run build:server` | Bundle `server.ts` with esbuild into `dist-server/server.mjs` (used by the Docker image) |
| `npm start` | Run `server.ts` with tsx (serves `dist/` when `NODE_ENV=production`) |
| `npm run preview` | Vite preview of the built front end |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` / `npm run test:watch` | Vitest, once / in watch mode |
| `npm run verify:pwa` | Check manifest, icons and screenshots ([scripts/verify-pwa.mjs](scripts/verify-pwa.mjs)) |
| `npm run verify:demo-entry` | Check the demo entry stays on the sign-in screen ([scripts/verify-demo-entry.mjs](scripts/verify-demo-entry.mjs)) |

## Demo mode (presentations)

Open the app with `?demo=1` (for example `https://admin.alturathkw.shop/?demo=1`, or `?demo=1&page=orders` to jump to a screen), press the demo button on the sign-in screen, or build with `VITE_DEMO_MODE=true`.
Demo mode skips sign-in, never touches Firebase or the API server (a fail-closed network guard blocks Firestore and `/api/*` calls are answered locally), and fills every screen from the in-memory dataset in [src/demoData.ts](src/demoData.ts). Use `?demo=0` to leave it.

Demo notes:
- `?page=` accepts the screen ids listed in the feature map; `?page=orders` opens "طلبات الموقع" directly, and `?page=invoices-list` opens the invoice ledger (its second tab is "طلبات التطبيق").
- Public pages work in demo: `/track?demo=1` (clickable sample order numbers), `/success?demo=1&invoice=ORD-8100` and `/failed?demo=1&invoice=ORD-8100` (show the result, then land on /track).
- AI features (image studio, reels, assistant chat, quick messages) answer with canned local Arabic responses and clearly labelled illustrative pictures/animated reels ([src/lib/demoAi.ts](src/lib/demoAi.ts)); the WhatsApp inbox keeps replies in memory only.

## Tests and quality gates

- Unit and regression tests use Vitest ([vitest.config.ts](vitest.config.ts)); the tests live in [src/tests](src/tests). The config disables the alerts runner and blanks Google credentials so tests never reach the live project.
- Covered areas include payments ([payment.test.ts](src/tests/payment.test.ts), [paymentWebhookRetry.test.ts](src/tests/paymentWebhookRetry.test.ts)), business rules and the role matrix ([businessRules.test.ts](src/tests/businessRules.test.ts)), invoice deletion ([invoiceDeletion.test.ts](src/tests/invoiceDeletion.test.ts)), push delivery and registration ([pushDelivery.test.ts](src/tests/pushDelivery.test.ts), [pushRegistration.test.ts](src/tests/pushRegistration.test.ts), [pushClient.test.ts](src/tests/pushClient.test.ts)), auth middleware ([auth_middleware.test.ts](src/tests/auth_middleware.test.ts)), WhatsApp security and delta polling ([whatsappSecurity.test.ts](src/tests/whatsappSecurity.test.ts), [whatsappConversationsDelta.test.ts](src/tests/whatsappConversationsDelta.test.ts)), the smart-studio auth gate ([smartStudioAuth.test.ts](src/tests/smartStudioAuth.test.ts)), the demo network guard ([demoNetworkGuard.test.ts](src/tests/demoNetworkGuard.test.ts)) and the updating page ([updatingPage.test.ts](src/tests/updatingPage.test.ts)).
- [CI](.github/workflows/ci.yml) runs on every push and pull request to `main`: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run build:server` (Node 22).
- Accessibility and layout results: [docs/QUALITY-SCORECARD.md](docs/QUALITY-SCORECARD.md). Open security items: [SECURITY-TODO.md](SECURITY-TODO.md).

## Deployment

- **Automatic on push to `main`.** A Google Cloud Build trigger runs [cloudbuild.yaml](cloudbuild.yaml): install, `npm run build` (with the commit as `BUILD_SHA`), `firebase deploy --only hosting`, then builds the [Dockerfile](Dockerfile) image and deploys it to the Cloud Run service `service` (europe-west3). It also creates or updates the Cloud Scheduler job that calls `/api/push/alerts-tick` every 5 minutes. The Cloud Build GitHub App must stay authorized for this repository. Firestore rules are not deployed by this pipeline.
- **[Deploy watchdog](.github/workflows/deploy-watchdog.yml)** (hourly at :17 and manual dispatch, read-only): fails if the live `build-id.json` was built before the latest `main` commit (45-minute grace).
- **[Alerts tick](.github/workflows/alerts-tick.yml)** (every 5 minutes and manual dispatch): calls `/api/push/alerts-tick` as a fallback to the Cloud Scheduler job.
- **Docker:** the [Dockerfile](Dockerfile) builds the front end and the server bundle, runs as a non-root user and starts `node dist-server/server.mjs` on port 8080.

Because every merge to `main` goes live, review and test changes on a branch first.

## Recovery Plan & Rollback

- **Rollback:** keep a previous stable image/commit available. If a deploy fails, revert the bad commit on `main` (which redeploys) or route Cloud Run traffic back to the previous revision.
- **Database:** back up Firestore regularly and keep the rules restrictive against unauthorized changes.
- **Service availability:** if push notifications or payments fail, check the webhook route logs for gateway changes or missing environment variables; `/api/push/alerts-status` reports the last alerts tick.

---

آخر تحديث للتوثيق: 2026-11-12
