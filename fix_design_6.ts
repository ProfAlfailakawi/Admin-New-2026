import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/OrderPage.tsx', 'utf8');

content = content.replace(/py-40/g, 'py-20 md:py-32');

writeFileSync('src/components/OrderPage.tsx', content);

console.log("Updated OrderPage heavy paddings");
