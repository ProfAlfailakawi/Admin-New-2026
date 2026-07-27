import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

content = content.replace(/max-h-\[750px\]/g, 'max-h-[60dvh] lg:max-h-[750px]');

writeFileSync('src/components/InvoicePage.tsx', content);
console.log("Updated InvoicePage");
