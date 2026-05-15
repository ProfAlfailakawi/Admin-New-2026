import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const lines = content.split('\n');
console.log("Lines 0 - 50:");
console.log(lines.slice(0, 50).join('\n'));
