import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/p-16 flex flex-col items-center justify-center text-center/g, 'p-8 md:p-16 flex flex-col items-center justify-center text-center');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated Dashboard p-16");
