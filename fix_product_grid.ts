import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/ProductPage.tsx', 'utf8');

content = content.replace(/sm:grid flex-col md:grid md:grid-cols-2/g, 'sm:grid-cols-2');

writeFileSync('src/components/ProductPage.tsx', content);
console.log("Updated ProductPage");
