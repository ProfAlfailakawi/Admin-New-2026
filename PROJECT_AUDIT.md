# Alturath Admin Project Audit

Last checked: 2026-05-23

## Current Status

- TypeScript check passes with `npm run lint`.
- Production build passes with `npm run build`.
- Local server starts at `http://localhost:3000`.
- Local Firebase Admin access is disabled without service credentials, so server-side push workers cannot be fully verified locally.
- Payment, push notifications, and AI code were reviewed only for boundaries and were not modified.

## Protected Areas

Do not change these areas without a focused test plan:

- Payments: `server.ts`, `src/components/InvoicePage.tsx`
- Push notifications: `server.ts`, `src/lib/pushNotifications.ts`, `public/firebase-messaging-sw.js`, `firebase-messaging-sw.js`
- AI: `server.ts`, `src/lib/ai-engine.ts`, `src/components/AIAssistant.tsx`, `src/components/SmartContentStudio.tsx`

## Cleanup Performed

Legacy patch scripts, temporary outputs, file-tree dumps, and broken component backups were moved to:

- `_project_archive/legacy-patches`
- `_project_archive/legacy-output`
- `_project_archive/broken-backups`

This was an archive-only cleanup. No operational code was deleted.

## Fixes Performed

- Diwaniya radar map now uses the local Kuwait SVG projection instead of an external map image with floating percentage calibration. This keeps location pins aligned when the page is resized on desktop or mobile.

## Key Risks To Address Before Production Hardening

1. Firestore rules allow broad public reads and updates for orders, invoices, and push tokens. This may be intentional for current flows, but it is the highest security risk.
2. Debug endpoints use `ADMIN_TEST_SECRET`, with some fallback behavior in code. Production should require a real secret and avoid defaults.
3. The main JavaScript bundle is large, currently about 2.4 MB after minification. This affects first load and mobile performance.
4. `npm ci` reports dependency vulnerabilities. Do not run automatic fixes blindly because major dependency changes can affect payment, notification, or AI behavior.
5. Firebase Admin requires production credentials or Secret Manager configuration to verify server-side notifications and scheduled alert behavior.

## Recommended Next Development

1. Create a staging Firebase project and test payment webhooks, push tokens, and AI calls safely before touching production.
2. Add a role-based permission model: owner, manager, order staff, accountant, kitchen, and partner.
3. Replace public invoice/order updates with signed customer action tokens.
4. Split large dashboard modules to reduce the first-load bundle.
5. Add operational health checks for payment gateway, Firebase Admin, push delivery, and AI availability.
6. Add export workflows for orders, invoices, reports, and accounting summaries.
7. Add activity logs for sensitive actions: payment status changes, invoice edits, order cancellation, product price changes, and user access changes.
8. Add automated smoke tests for login page, dashboard load, invoice creation flow, and service worker registration.
