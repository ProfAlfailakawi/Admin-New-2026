import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
console.log(lines.slice(1230, 1290).join('\n'));
