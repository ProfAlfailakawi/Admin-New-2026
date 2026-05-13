#!/usr/bin/env node
/**
 * ALTURATH ADMIN/PARTNER FINAL DEEPLINK PATCH
 *
 * Applies the final working behavior:
 * - Admin + Partner
 * - INV + ORD
 * - PWA notification click
 * - /track old links
 * - Opens invoices-list / ReportsPage / invoices tab
 * - Searches by full ID
 * - Clears URL/sessionStorage after opening so app navigation works normally
 *
 * Run from project root:
 *   node scripts/apply-admin-partner-deeplink-final.cjs
 *
 * Then:
 *   npm run build
 *   firebase deploy --only hosting --project gen-lang-client-0878573239
 *
 * No Cloud Run required.
 */

const fs = require("fs");
const path = require("path");

function file(filePath) {
  return path.join(process.cwd(), filePath);
}
function read(filePath) {
  const p = file(filePath);
  if (!fs.existsSync(p)) throw new Error(`Missing file: ${filePath}`);
  return [p, fs.readFileSync(p, "utf8")];
}
function write(p, text) {
  fs.writeFileSync(p, text);
}
function removeDebugLogs(text) {
  text = text.replace(/\n\s*console\.log\("DEEP_LINK_DEBUG_APP_AFTER_INIT", \{[\s\S]*?\n\s*\}\);\n/g, "\n");
  text = text.replace(/\n\s*console\.log\("DEEP_LINK_DEBUG_REPORTS_PAGE", \{[\s\S]*?\n\s*\}\);\n/g, "\n");
  return text;
}

function patchApp() {
  const [p, original] = read("src/App.tsx");
  let text = removeDebugLogs(original);

  // Add or replace helpers.
  const helper = `const getInitialPushDeepLink = () => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  const targetId =
    params.get('invoice') ||
    params.get('order') ||
    params.get('tracked_order') ||
    params.get('requested_order_id') ||
    params.get('order_id');

  if (targetId) {
    const payload = {
      tab: 'invoices',
      search: String(targetId),
      source: path === '/track' ? 'track' : 'push',
      fullId: String(targetId),
      pushNotificationDeepLinkHandled: true
    };

    try {
      sessionStorage.setItem('adminPushDeepLink', JSON.stringify(payload));
    } catch {}

    return payload;
  }

  // Old /track without query should not open the removed Track page.
  if (path === '/track') {
    const payload = {
      tab: 'invoices',
      search: '',
      source: 'track',
      fullId: '',
      pushNotificationDeepLinkHandled: true
    };

    try {
      sessionStorage.setItem('adminPushDeepLink', JSON.stringify(payload));
    } catch {}

    return payload;
  }

  try {
    const saved = sessionStorage.getItem('adminPushDeepLink');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const hasInitialPushDeepLink = () => Boolean(getInitialPushDeepLink());

`;

  if (text.includes("const getInitialPushDeepLink = () => {")) {
    const start = text.indexOf("const getInitialPushDeepLink = () => {");
    const end = text.indexOf("const hasInitialPushDeepLink", start);
    if (end !== -1) {
      const after = text.indexOf("\n", end);
      const after2 = after === -1 ? end : after + 1;
      text = text.slice(0, start) + helper + text.slice(after2);
    }
  } else {
    let lastImportEnd = 0;
    const importRegex = /^import .*?;\n/gm;
    let m;
    while ((m = importRegex.exec(text)) !== null) {
      lastImportEnd = m.index + m[0].length;
    }
    if (!lastImportEnd) throw new Error("Could not find imports in src/App.tsx");
    text = text.slice(0, lastImportEnd) + "\n" + helper + text.slice(lastImportEnd);
  }

  // Prevent old Upayments callback / Track hijack.
  text = text.replace(
    "const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result') || searchParams.has('invoice');",
    "const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result');"
  );
  text = text.replace(
    'const isUpaymentsCallback = searchParams.has("payment_id") || searchParams.has("result") || searchParams.has("invoice");',
    'const isUpaymentsCallback = searchParams.has("payment_id") || searchParams.has("result");'
  );

  text = text.replaceAll("setCurrentPage('track')", "setCurrentPage('invoices-list')");
  text = text.replaceAll('setCurrentPage("track")', 'setCurrentPage("invoices-list")');

  text = text.replace(
    "const invoiceId = searchParams.get('invoice') || searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];",
    "const invoiceId = searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];"
  );
  text = text.replace(
    'const invoiceId = searchParams.get("invoice") || searchParams.get("requested_order_id") || searchParams.get("order_id") || path.split("/invoice/")[1];',
    'const invoiceId = searchParams.get("requested_order_id") || searchParams.get("order_id") || path.split("/invoice/")[1];'
  );

  // Initial currentPage / deepLinkData.
  text = text.replace(
    /const\s+\[currentPage,\s*setCurrentPage\]\s*=\s*useState\((['"][^'"]+['"])\);/,
    "const [currentPage, setCurrentPage] = useState(hasInitialPushDeepLink() ? 'invoices-list' : $1);"
  );

  text = text.replace(
    /const\s+\[deepLinkData,\s*setDeepLinkData\]\s*=\s*useState(?:<[^>]+>)?\((?:\{\}|null|undefined)\);/,
    "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});"
  );
  text = text.replace(
    /const\s+\[deepLinkData,\s*setDeepLinkData\]\s*=\s*useState<\{[^}]*\}>\(\{\}\);/,
    "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});"
  );

  // Replace any push handler to use invoices-list.
  const handlerMarker = "// Handle push notification deep links:";
  const handler = `// Handle push notification deep links:
  // Admin + Partner: ORD + INV both open invoices-list / ReportsPage / invoices tab.
  useEffect(() => {
    const saved = getInitialPushDeepLink();
    if (!saved?.pushNotificationDeepLinkHandled) return;

    setDeepLinkData(saved);
    setCurrentPage('invoices-list');
  }, []);

`;
  const hs = text.indexOf(handlerMarker);
  if (hs !== -1) {
    const he = text.indexOf("  }, []);", hs);
    if (he !== -1) {
      text = text.slice(0, hs) + handler + text.slice(he + "  }, []);".length);
    }
  } else {
    const dl = "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});";
    const idx = text.indexOf(dl);
    if (idx !== -1) {
      const lineEnd = text.indexOf("\n", idx);
      text = text.slice(0, lineEnd + 1) + "\n  " + handler + text.slice(lineEnd + 1);
    }
  }

  // Remove old restore effects and add final one based only on sessionStorage.
  text = text.replace(/\n\s*\/\/ ADMIN_PUSH_DEEPLINK_RESTORE_EFFECT[\s\S]*?\n\s*useEffect\(\(\) => \{[\s\S]*?\n\s*\}, \[\]\);\n/g, "\n");
  text = text.replace(/\n\s*\/\/ ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT[\s\S]*?\n\s*useEffect\(\(\) => \{[\s\S]*?\n\s*\}, \[currentPage\]\);\n/g, "\n");

  const dl = "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});";
  const idx = text.indexOf(dl);
  if (idx !== -1 && !text.includes("ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT")) {
    const lineEnd = text.indexOf("\n", idx);
    const effect = `
  // ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT
  // Auth/data initialization may reset currentPage.
  // If a stored push/track deep link exists, restore invoices-list.
  useEffect(() => {
    const savedRaw = sessionStorage.getItem('adminPushDeepLink');
    if (!savedRaw) return;

    let saved: any = null;
    try {
      saved = JSON.parse(savedRaw);
    } catch {}

    if (!saved?.pushNotificationDeepLinkHandled) return;

    setDeepLinkData(saved);

    if (currentPage !== 'invoices-list') {
      setCurrentPage('invoices-list');
    }
  }, [currentPage]);

`;
    text = text.slice(0, lineEnd + 1) + effect + text.slice(lineEnd + 1);
  }

  // Ensure reports/invoices-list cases pass deepLinkData.
  text = text.replace(
    "case 'reports': return <ReportsPage data={data} setData={setData} />;",
    `case 'reports': return (
        <ReportsPage
          data={data}
          setData={setData}
          deepLinkData={deepLinkData}
          onClearDeepLink={() => setDeepLinkData({})}
        />
      );`
  );
  text = text.replace(
    "case 'invoices-list': return <ReportsPage data={data} setData={setData} />;",
    `case 'invoices-list': return (
        <ReportsPage
          data={data}
          setData={setData}
          deepLinkData={deepLinkData}
          onClearDeepLink={() => setDeepLinkData({})}
        />
      );`
  );

  text = removeDebugLogs(text);
  write(p, text);
  console.log("OK: patched src/App.tsx");
}

function patchReportsPage() {
  const [p, original] = read("src/components/ReportsPage.tsx");
  let text = removeDebugLogs(original);

  // Ensure props support deepLinkData.
  text = text.replace(
    /const ReportsPage\s*=\s*\(\{\s*data,\s*setData\s*\}\s*:\s*any\)\s*=>/,
    "const ReportsPage = ({ data, setData, deepLinkData, onClearDeepLink }: any) =>"
  );
  text = text.replace(
    /export default function ReportsPage\s*\(\{\s*data,\s*setData\s*\}\s*:\s*any\)/,
    "export default function ReportsPage({ data, setData, deepLinkData, onClearDeepLink }: any)"
  );

  text = text.replaceAll("React.React.useEffect", "React.useEffect");
  text = text.replace(/\buseEffect\(\(\) => \{/g, "React.useEffect(() => {");

  // Add reportsPushDeepLinkHandled if missing.
  if (!text.includes("reportsPushDeepLinkHandled")) {
    const patterns = [
      /const\s+\[search,\s*setSearch\]\s*=\s*useState[^\n]*\n/,
      /const\s+\[searchTerm,\s*setSearchTerm\]\s*=\s*useState[^\n]*\n/,
      /const\s+\[searchQuery,\s*setSearchQuery\]\s*=\s*useState[^\n]*\n/,
      /const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState[^\n]*\n/,
    ];

    let insertAfter = -1;
    let setter = "setSearch";
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        insertAfter = m.index + m[0].length;
        if (m[0].includes("setSearchTerm")) setter = "setSearchTerm";
        if (m[0].includes("setSearchQuery")) setter = "setSearchQuery";
        break;
      }
    }
    if (insertAfter === -1) throw new Error("Could not find search/activeTab state in ReportsPage.tsx");

    const block = `
  // reportsPushDeepLinkHandled
  React.useEffect(() => {
    if (!deepLinkData?.pushNotificationDeepLinkHandled && !deepLinkData?.search) return;

    const searchValue = String(deepLinkData.search || deepLinkData.fullId || "");

    setActiveTab("invoices");
    ${setter}(searchValue);

    try {
      sessionStorage.removeItem('adminPushDeepLink');
      window.history.replaceState({}, '', '/');
    } catch {}

    if (typeof onClearDeepLink === "function") {
      setTimeout(() => onClearDeepLink(), 300);
    }
  }, [deepLinkData?.search, (deepLinkData as any)?.tab]);

`;
    text = text.slice(0, insertAfter) + block + text.slice(insertAfter);
  }

  // Add direct URL safety layer if missing.
  if (!text.includes("REPORTS_PAGE_DIRECT_URL_DEEPLINK")) {
    const m = text.match(/const\s+\[search,\s*setSearch\]\s*=\s*useState[^\n]*\n/);
    const insertAfter = m ? m.index + m[0].length : -1;
    if (insertAfter !== -1) {
      const block = `
  // REPORTS_PAGE_DIRECT_URL_DEEPLINK
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    let targetId =
      params.get('invoice') ||
      params.get('order') ||
      params.get('tracked_order') ||
      params.get('requested_order_id') ||
      params.get('order_id') ||
      '';

    if (!targetId) {
      try {
        const saved = sessionStorage.getItem('adminPushDeepLink');
        if (saved) {
          const parsed = JSON.parse(saved);
          targetId = parsed?.search || parsed?.fullId || '';
        }
      } catch {}
    }

    if (!targetId && !deepLinkData?.search) return;

    const finalSearch = String(targetId || deepLinkData?.search || '');

    setActiveTab('invoices');
    setSearch(finalSearch);

    try {
      sessionStorage.removeItem('adminPushDeepLink');
      window.history.replaceState({}, '', '/');
    } catch {}

    if (typeof onClearDeepLink === "function") {
      setTimeout(() => onClearDeepLink(), 300);
    }
  }, [deepLinkData?.search]);

`;
      text = text.slice(0, insertAfter) + block + text.slice(insertAfter);
    }
  } else {
    // Ensure final behavior exists in existing block.
    text = text.replaceAll("React.React.useEffect", "React.useEffect");
  }

  // Ensure existing old handlers don't send to orders.
  text = text.replace(/setActiveTab\(['"]orders['"]\);/g, 'setActiveTab("invoices");');
  text = text.replace(/setActiveTab\(['"]app-orders['"]\);/g, 'setActiveTab("invoices");');

  text = removeDebugLogs(text);
  write(p, text);
  console.log("OK: patched src/components/ReportsPage.tsx");
}

patchApp();
patchReportsPage();

console.log("");
console.log("VERIFY:");
console.log('grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo OK');
console.log('grep -n "setCurrentPage(\\\'track\\\')\\|setCurrentPage(\\\"track\\\")\\|searchParams.get(\\\'invoice\\\')\\|searchParams.get(\\\"invoice\\\")" src/App.tsx || echo OK');
console.log('grep -n "REPORTS_PAGE_DIRECT_URL_DEEPLINK\\|reportsPushDeepLinkHandled\\|React.React.useEffect\\|React.useEffect" src/components/ReportsPage.tsx | head -80');
console.log("");
console.log("THEN:");
console.log("npm run build");
console.log("firebase deploy --only hosting --project gen-lang-client-0878573239");
