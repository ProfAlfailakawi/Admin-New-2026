import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
console.log(lines.slice(0, 50).join('\n'));
