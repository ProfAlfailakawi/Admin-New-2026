import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

const targetStr = "indexOf(d).toString());\\n}\\n";
const idx = content.indexOf(targetStr);

if (idx > -1) {
  let mainCodeIdx = content.indexOf('import React, { useState, useEffect }');
  if (mainCodeIdx > -1) {
    let cleanHead = content.substring(0, idx + targetStr.length);
    cleanHead = cleanHead.replace(/\\\\n/g, '\n'); 
    // And actually it should be `}\nimport`
    content = cleanHead + '\n' + content.substring(mainCodeIdx);
    writeFileSync('src/components/InvoicePage.tsx', content);
  }
}
