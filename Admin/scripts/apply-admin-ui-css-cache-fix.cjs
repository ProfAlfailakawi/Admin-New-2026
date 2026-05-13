#!/usr/bin/env node
/**
 * Admin UI CSS / Hosting Cache Fix
 *
 * Run from project root:
 *   node scripts/apply-admin-ui-css-cache-fix.cjs
 *
 * Then:
 *   npm run build
 *   firebase deploy --only hosting --project gen-lang-client-0878573239
 *
 * Purpose:
 * - Ensure the app imports the main CSS file.
 * - Ensure Firebase Hosting does not serve stale index / service worker files.
 * - Keep assets cache-safe.
 * - Does NOT touch Cloud Run, server.ts, push notification logic, tokens, or Scheduler.
 */

const fs = require("fs");
const path = require("path");

function exists(file) {
  return fs.existsSync(path.join(process.cwd(), file));
}

function read(file) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) throw new Error(`Missing file: ${file}`);
  return [p, fs.readFileSync(p, "utf8")];
}

function write(p, text) {
  fs.writeFileSync(p, text);
}

function ensureMainCssImport() {
  const candidates = [
    "src/main.tsx",
    "src/main.jsx",
    "src/main.ts",
    "src/main.js",
  ];

  const mainFile = candidates.find(exists);
  if (!mainFile) {
    console.log("SKIP: no src/main.* file found");
    return;
  }

  const [p, original] = read(mainFile);
  let text = original;

  const cssCandidates = [
    "src/index.css",
    "src/App.css",
    "src/styles.css",
    "src/globals.css",
    "src/global.css",
    "src/styles/globals.css",
    "src/styles/global.css",
  ];

  const cssFile = cssCandidates.find(exists);
  if (!cssFile) {
    console.log("SKIP: no known CSS file found");
    return;
  }

  const importPath = "./" + path.relative(path.dirname(mainFile), cssFile).replaceAll("\\", "/");
  const normalizedImportPath = importPath.startsWith("./") ? importPath : "./" + importPath;

  const hasAnyCssImport =
    /import\s+['"].*\.css['"];?/.test(text) ||
    /import\s+["']\.\/index\.css["'];?/.test(text);

  if (!hasAnyCssImport) {
    text = `import '${normalizedImportPath}';\n` + text;
    write(p, text);
    console.log(`OK: added CSS import to ${mainFile}: ${normalizedImportPath}`);
  } else {
    console.log(`OK: ${mainFile} already has CSS import`);
  }
}

function patchFirebaseJson() {
  const [p, original] = read("firebase.json");
  let data;

  try {
    data = JSON.parse(original);
  } catch (e) {
    throw new Error("firebase.json is not valid JSON");
  }

  if (!data.hosting) data.hosting = {};
  if (!Array.isArray(data.hosting.headers)) data.hosting.headers = [];

  const headers = data.hosting.headers;

  function upsertHeader(source, values) {
    let entry = headers.find(h => h.source === source);
    if (!entry) {
      entry = { source, headers: [] };
      headers.push(entry);
    }

    for (const [key, value] of Object.entries(values)) {
      const found = entry.headers.find(h => h.key.toLowerCase() === key.toLowerCase());
      if (found) found.value = value;
      else entry.headers.push({ key, value });
    }
  }

  // Never cache app shell, so new deploy does not keep old routes/CSS references.
  upsertHeader("/*.html", {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  upsertHeader("/index.html", {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  // Never cache service worker.
  upsertHeader("/firebase-messaging-sw.js", {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  // Hashed assets are okay to cache, but this is safe because filenames change on build.
  upsertHeader("/assets/**", {
    "Cache-Control": "public, max-age=31536000, immutable"
  });

  write(p, JSON.stringify(data, null, 2) + "\n");
  console.log("OK: patched firebase.json hosting headers");
}

function ensureNoDebugLogs() {
  const files = ["src/App.tsx", "src/components/ReportsPage.tsx"];
  for (const file of files) {
    if (!exists(file)) continue;
    const [p, original] = read(file);
    let text = original;
    text = text.replace(/\n\s*console\.log\("DEEP_LINK_DEBUG_APP_AFTER_INIT", \{[\s\S]*?\n\s*\}\);\n/g, "\n");
    text = text.replace(/\n\s*console\.log\("DEEP_LINK_DEBUG_REPORTS_PAGE", \{[\s\S]*?\n\s*\}\);\n/g, "\n");
    if (text !== original) {
      write(p, text);
      console.log(`OK: removed deep-link debug logs from ${file}`);
    }
  }
}

ensureMainCssImport();
patchFirebaseJson();
ensureNoDebugLogs();

console.log("");
console.log("NEXT:");
console.log("npm run build");
console.log("firebase deploy --only hosting --project gen-lang-client-0878573239");
console.log("");
console.log("TEST:");
console.log("https://admin.alturathkw.shop/?invoice=INV-1778372934783-JX6Y&v=cssfix");
console.log("https://admin.alturathkw.shop/?order=ORD-1778514977189-C23P&v=cssfix");
