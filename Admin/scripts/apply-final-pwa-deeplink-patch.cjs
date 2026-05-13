#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function read(file) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) throw new Error(`Missing file: ${file}`);
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
  let text = original;

  text = removeDebugLogs(text);

  if (!text.includes("const getInitialPushDeepLink = () => {")) {
    let lastImportEnd = 0;
    const importRegex = /^import .*?;\n/gm;
    let m;
    while ((m = importRegex.exec(text)) !== null) {
      lastImportEnd = m.index + m[0].length;
    }

    const helper = `
const getInitialPushDeepLink = () => {
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

  try {
    const saved = sessionStorage.getItem('adminPushDeepLink');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const hasInitialPushDeepLink = () => Boolean(getInitialPushDeepLink());

`;
    text = text.slice(0, lastImportEnd) + helper + text.slice(lastImportEnd);
  } else {
    const start = text.indexOf("const getInitialPushDeepLink = () => {");
    const end = text.indexOf("const hasInitialPushDeepLink", start);
    if (start !== -1 && end !== -1) {
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

  try {
    const saved = sessionStorage.getItem('adminPushDeepLink');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

`;
      text = text.slice(0, start) + helper + text.slice(end);
    }
    text = text.replace(
      /const hasInitialPushDeepLink = \(\) => Boolean\(getInitialPushDeepLink\(\)\);?/,
      "const hasInitialPushDeepLink = () => Boolean(getInitialPushDeepLink());"
    );
  }

  text = text.replace(
    "const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result') || searchParams.has('invoice');",
    "const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result');"
  );
  text = text.replace(
    'const isUpaymentsCallback = searchParams.has("payment_id") || searchParams.has("result") || searchParams.has("invoice");',
    'const isUpaymentsCallback = searchParams.has("payment_id") || searchParams.has("result");'
  );

  text = text.replaceAll("setCurrentPage('track')", "setCurrentPage('reports')");
  text = text.replaceAll('setCurrentPage("track")', 'setCurrentPage("reports")');

  text = text.replace(
    "const invoiceId = searchParams.get('invoice') || searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];",
    "const invoiceId = searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];"
  );
  text = text.replace(
    'const invoiceId = searchParams.get("invoice") || searchParams.get("requested_order_id") || searchParams.get("order_id") || path.split("/invoice/")[1];',
    'const invoiceId = searchParams.get("requested_order_id") || searchParams.get("order_id") || path.split("/invoice/")[1];'
  );

  text = text.replace(
    /const\s+\[currentPage,\s*setCurrentPage\]\s*=\s*useState\((['"][^'"]+['"])\);/,
    "const [currentPage, setCurrentPage] = useState(hasInitialPushDeepLink() ? 'reports' : $1);"
  );

  text = text.replace(
    /const\s+\[deepLinkData,\s*setDeepLinkData\]\s*=\s*useState(?:<[^>]+>)?\((?:\{\}|null|undefined)\);/,
    "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});"
  );
  text = text.replace(
    /const\s+\[deepLinkData,\s*setDeepLinkData\]\s*=\s*useState<\{[^}]*\}>\(\{\}\);/,
    "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});"
  );

  const handlerMarker = "// Handle push notification deep links:";
  const handler = `// Handle push notification deep links:
  // ORD + INV must both open ReportsPage invoices tab and search by full ID.
  // Old /track?tracked_order=... links are also supported.
  useEffect(() => {
    const saved = getInitialPushDeepLink();
    if (!saved?.search) return;

    setDeepLinkData(saved);
    setCurrentPage('reports');

    window.history.replaceState({}, '', '/');
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

  text = text.replace(/\n\s*\/\/ ADMIN_PUSH_DEEPLINK_RESTORE_EFFECT[\s\S]*?\n\s*useEffect\(\(\) => \{[\s\S]*?\n\s*\}, \[\]\);\n/g, "\n");
  text = text.replace(/\n\s*\/\/ ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT[\s\S]*?\n\s*useEffect\(\(\) => \{[\s\S]*?\n\s*\}, \[currentPage\]\);\n/g, "\n");

  const dl = "const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});";
  const idx = text.indexOf(dl);
  if (idx !== -1 && !text.includes("ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT")) {
    const lineEnd = text.indexOf("\n", idx);
    const effect = `
  // ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT
  // Auth/data initialization may reset currentPage to dashboard.
  // If a push/track deep link exists, always force ReportsPage back.
  useEffect(() => {
    const saved = getInitialPushDeepLink();
    if (!saved?.search) return;

    setDeepLinkData(saved);

    if (currentPage !== 'reports') {
      setCurrentPage('reports');
    }
  }, [currentPage]);

`;
    text = text.slice(0, lineEnd + 1) + effect + text.slice(lineEnd + 1);
  }

  text = text.replace(
    "case 'reports': return <ReportsPage data={data} setData={setData} />;",
    `case 'reports': return (
        <ReportsPage
          data={data}
          setData={setData}
          deepLinkData={deepLinkData}
          onClearDeepLink={() => {}}
        />
      );`
  );

  text = text.replaceAll("onClearDeepLink={() => setDeepLinkData({})}", "onClearDeepLink={() => {}}");

  text = removeDebugLogs(text);
  write(p, text);
  console.log("OK: patched src/App.tsx");
}

function patchReportsPage() {
  const [p, original] = read("src/components/ReportsPage.tsx");
  let text = original;

  text = removeDebugLogs(text);

  text = text.replace(
    /const ReportsPage\s*=\s*\(\{\s*data,\s*setData\s*\}\s*:\s*any\)\s*=>/,
    "const ReportsPage = ({ data, setData, deepLinkData, onClearDeepLink }: any) =>"
  );
  text = text.replace(
    /export default function ReportsPage\s*\(\{\s*data,\s*setData\s*\}\s*:\s*any\)/,
    "export default function ReportsPage({ data, setData, deepLinkData, onClearDeepLink }: any)"
  );

  text = text.replace(/\buseEffect\(\(\) => \{/g, "React.useEffect(() => {");

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
  // Push/PWA click deep links open ReportsPage -> invoices tab -> full ID search.
  React.useEffect(() => {
    if (!deepLinkData?.search) return;

    const searchValue = String(deepLinkData.search || "");

    setActiveTab("invoices");
    ${setter}(searchValue);

    if (typeof onClearDeepLink === "function") {
      setTimeout(() => onClearDeepLink(), 300);
    }
  }, [deepLinkData?.search, (deepLinkData as any)?.tab]);

`;
    text = text.slice(0, insertAfter) + block + text.slice(insertAfter);
  } else {
    text = text.replace(/setActiveTab\(['"]orders['"]\);/g, 'setActiveTab("invoices");');
    text = text.replace(/setActiveTab\(['"]app-orders['"]\);/g, 'setActiveTab("invoices");');
  }

  text = removeDebugLogs(text);
  write(p, text);
  console.log("OK: patched src/components/ReportsPage.tsx");
}

function patchServerUrlsIfPresent() {
  const server = path.join(process.cwd(), "server.ts");
  if (!fs.existsSync(server)) {
    console.log("SKIP: server.ts not found");
    return;
  }

  let text = fs.readFileSync(server, "utf8");
  text = text.replace(/url:\s*`\/\?order=\$\{encodeURIComponent\(orderId\)\}`/g, 'url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`');
  text = text.replace(/url:\s*`\/\?order=\$\{encodeURIComponent\(\(order as any\)\.id\)\}`/g, 'url: `https://admin.alturathkw.shop/?order=${encodeURIComponent((order as any).id)}`');
  text = text.replace(/url:\s*`\/\?invoice=\$\{encodeURIComponent\(invoiceId\)\}`/g, 'url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}`');
  text = text.replace("const url = `/?invoice=${orderId}`;", "const url = `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(orderId)}`;");
  text = text.replace("const url = `/?order=${orderId}`;", "const url = `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`;");
  fs.writeFileSync(server, text);
  console.log("OK: patched server.ts click URLs if present");
}

patchApp();
patchReportsPage();
patchServerUrlsIfPresent();

console.log("");
console.log("VERIFY:");
console.log('grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo OK');
console.log('grep -n "searchParams.has(\\\'invoice\\\')\\|searchParams.has(\\\"invoice\\\")\\|searchParams.get(\\\'invoice\\\')\\|searchParams.get(\\\"invoice\\\")\\|setCurrentPage(\\\'track\\\')\\|setCurrentPage(\\\"track\\\")" src/App.tsx || echo OK');
console.log('grep -n "reportsPushDeepLinkHandled\\|React.useEffect\\|deepLinkData" src/components/ReportsPage.tsx | head -40');
console.log("");
console.log("THEN:");
console.log("npm run build");
console.log("firebase deploy --only hosting");
