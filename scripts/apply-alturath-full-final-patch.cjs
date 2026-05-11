#!/usr/bin/env node
/**
 * ALTURATH FINAL FULL PATCH
 *
 * Includes:
 * 1) Full admin push notifications:
 *    - ORD new / pending 10min / failed / paid
 *    - INV new / pending 10min / failed / paid
 *    - data-only FCM
 *    - pushEvents dedupe
 *    - latest token only
 *    - Scheduler-compatible run-business-alerts
 *
 * 2) PWA notification click deep-link:
 *    - ?invoice=INV-... opens ReportsPage -> invoices -> full ID search
 *    - ?order=ORD-... opens ReportsPage -> invoices -> full ID search
 *    - /track?tracked_order=... is supported and redirected internally
 *
 * Run from project root:
 *   node scripts/apply-alturath-full-final-patch.cjs
 *
 * Then:
 *   npm run build
 *   firebase deploy --only hosting
 *
 * Cloud Run is required because server.ts is patched:
 *   gcloud run deploy service --source . --region europe-west2 --project gen-lang-client-0878573239 --allow-unauthenticated --set-env-vars ADMIN_TEST_SECRET=123456
 *   gcloud run services update-traffic service --region europe-west2 --project gen-lang-client-0878573239 --to-latest
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function run(script) {
  const p = path.join(process.cwd(), script);
  if (!fs.existsSync(p)) {
    console.log(`SKIP: ${script} not found`);
    return;
  }
  console.log(`\n===== RUNNING ${script} =====`);
  execFileSync("node", [p], { stdio: "inherit" });
}

run("scripts/apply-all-final-admin-push.js");
run("scripts/apply-all-final-admin-push.cjs");
run("scripts/apply-final-pwa-deeplink-patch.cjs");

console.log("\n===== FINAL VERIFY COMMANDS =====");
console.log('grep -n "notification:" server.ts || echo "OK: no notification payload"');
console.log('grep -n "business-order-created\\|payment-pending-10min\\|payment-failed-\\|payment-paid-" server.ts');
console.log('grep -n "invoice-created-\\|invoice-pending-10min\\|invoice-failed-\\|invoice-paid-" server.ts');
console.log('grep -n "claimBusinessPushEvent\\|claimDirectInvoiceEvent\\|pushEvents\\|slice(0, 1)\\|tokenUpdatedAtMs\\|lastCheckedAt\\|businessSince" server.ts');
console.log('grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo "OK: no debug logs"');
console.log('grep -n "searchParams.has(\\\'invoice\\\')\\|searchParams.has(\\\"invoice\\\")\\|searchParams.get(\\\'invoice\\\')\\|searchParams.get(\\\"invoice\\\")\\|setCurrentPage(\\\'track\\\')\\|setCurrentPage(\\\"track\\\")" src/App.tsx || echo "OK: no old track hijack"');
console.log('grep -n "reportsPushDeepLinkHandled\\|React.useEffect\\|deepLinkData" src/components/ReportsPage.tsx | head -40');

console.log("\n===== NEXT STEPS =====");
console.log("1) npm run build");
console.log("2) firebase deploy --only hosting");
console.log("3) gcloud run deploy service --source . --region europe-west2 --project gen-lang-client-0878573239 --allow-unauthenticated --set-env-vars ADMIN_TEST_SECRET=123456");
console.log("4) gcloud run services update-traffic service --region europe-west2 --project gen-lang-client-0878573239 --to-latest");
