import { readFileSync, writeFileSync } from 'fs';

let serverTs = readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  /console\.warn\("Firestore fetch restricted or failed\. Continuing with minimal payload\.", err\.message\);/g,
  `if (!String(err).includes("PERMISSION_DENIED")) {
      console.warn("Firestore fetch restricted or failed. Continuing with minimal payload.", err.message);
   }`
);

// We should also replace the App.tsx one precisely.
let appTsx = readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(
  /\(err\)\s*=>\s*console\.error\("orders sync error:\s*",\s*err\)/g,
  `((err) => { if (!String(err).includes("Missing or insufficient permissions")) console.error("orders sync error: ", err); })`
);

appTsx = appTsx.replace(
  /console\.error\("Failed to sync orders collection:",\s*e\);/g,
  `if (!String(e).includes("Missing or insufficient permissions")) console.error("Failed to sync orders collection:", e);`
);

writeFileSync('src/App.tsx', appTsx);
writeFileSync('server.ts', serverTs);
console.log("Fixed logs");
