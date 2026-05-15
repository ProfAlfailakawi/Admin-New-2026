import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

const lines = content.split('\n');
console.log(lines.slice(0, 10).map((l, i) => i + ": " + JSON.stringify(l)).join('\n'));
