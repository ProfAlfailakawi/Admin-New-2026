#!/usr/bin/env node
/**
 * ALTURATH COMPLETE FINAL PATCH
 *
 * Apply order:
 * 1) Full admin notifications patch
 * 2) Latest Admin+Partner PWA click/deeplink patch
 *
 * Run from project root:
 *   node scripts/apply-alturath-complete-final.cjs
 *
 * Then:
 *   npm run build
 *   firebase deploy --only hosting --project gen-lang-client-0878573239
 *
 * If server.ts changed and you need backend notification logic:
 *   gcloud run deploy service --source . --region europe-west2 --project gen-lang-client-0878573239 --allow-unauthenticated --set-env-vars ADMIN_TEST_SECRET=123456
 *   gcloud run services update-traffic service --region europe-west2 --project gen-lang-client-0878573239 --to-latest
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function runIfExists(scriptPath) {
  const p = path.join(process.cwd(), scriptPath);
  if (!fs.existsSync(p)) {
    console.log(`SKIP missing: ${scriptPath}`);
    return;
  }
  console.log(`\n===== RUN ${scriptPath} =====`);
  execFileSync("node", [p], { stdio: "inherit" });
}

// Full notifications
runIfExists("scripts/apply-alturath-full-final-patch.cjs");
runIfExists("scripts/apply-all-final-admin-push.cjs");
runIfExists("scripts/apply-all-final-admin-push.js");

// Latest click/deeplink fix MUST run last
runIfExists("scripts/apply-admin-partner-deeplink-final.cjs");

console.log("\nDONE.");
console.log("\nVERIFY:");
console.log('grep -n "notification:" server.ts || echo "OK: no notification payload"');
console.log('grep -n "setCurrentPage(\\\'track\\\')\\|setCurrentPage(\\\"track\\\")\\|searchParams.get(\\\'invoice\\\')\\|searchParams.get(\\\"invoice\\\")" src/App.tsx || echo "OK: no old track hijack"');
console.log('grep -n "REPORTS_PAGE_DIRECT_URL_DEEPLINK\\|reportsPushDeepLinkHandled\\|React.React.useEffect\\|React.useEffect" src/components/ReportsPage.tsx | head -80');
console.log("\nDEPLOY:");
console.log("npm run build");
console.log("firebase deploy --only hosting --project gen-lang-client-0878573239");
