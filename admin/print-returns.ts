import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const returns = content.match(/if \(.*?\)\s*{\s*return[\s\S]*?;\s*}/g) || [];
console.log(returns.map(r => r.split('\n')[0]));
