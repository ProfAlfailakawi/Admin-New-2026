import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

console.log(JSON.stringify(content.substring(0, 200)));
