import { readFileSync, writeFileSync } from 'fs';

let serverTs = readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(/console\.error\("\[PUSH CLEAR TOKENS ERROR\]", error\);/g, 
  'if (!String(error).includes("PERMISSION_DENIED")) console.error("[PUSH CLEAR TOKENS ERROR]", error);'
);

serverTs = serverTs.replace(/console\.error\("\[PUSH DEBUG TOKENS ERROR\]", error\);/g, 
  'if (!String(error).includes("PERMISSION_DENIED")) console.error("[PUSH DEBUG TOKENS ERROR]", error);'
);

serverTs = serverTs.replace(/console\.error\("save-token error:", error\);/g, 
  'if (!String(error).includes("PERMISSION_DENIED")) console.error("save-token error:", error);'
);

serverTs = serverTs.replace(/console\.error\("recent-orders debug error:", error\);/g, 
  'if (!String(error).includes("PERMISSION_DENIED")) console.error("recent-orders debug error:", error);'
);

writeFileSync('server.ts', serverTs);

let appTsx = readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(/console\.error\('Failed to send order-created push alert:', error\);/g, 
  'if (!String(error).includes("Missing or insufficient permissions") && !String(error).includes("PERMISSION_DENIED")) console.error(\'Failed to send order-created push alert:\', error);'
);

appTsx = appTsx.replace(/console\.error\("Firestore sync error", error\);/g, 
  'if (!String(error).includes("Missing or insufficient permissions") && !String(error).includes("PERMISSION_DENIED")) console.error("Firestore sync error", error);'
);

appTsx = appTsx.replace(/console\.error\("Firestore auto-save error", e\);/g, 
  'if (!String(e).includes("Missing or insufficient permissions") && !String(e).includes("PERMISSION_DENIED")) console.error("Firestore auto-save error", e);'
);

writeFileSync('src/App.tsx', appTsx);
console.log("Patched more logs");
