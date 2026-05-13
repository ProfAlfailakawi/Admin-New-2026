import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(lines.length - 30, lines.length).join('\n'));
