import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/توصية النظام المتقدمة/g, 'مستشارك: التاجر العود');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated AI dashboard texts");
