import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

content = content.replace(/\\nimport React/g, 'import React');

writeFileSync('src/components/InvoicePage.tsx', content);
