import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const lines = content.split('\n');
console.log(lines.slice(lines.length - 20, lines.length).join('\n'));
