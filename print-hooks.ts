import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');
const trackingIndex = lines.findIndex(l => l.includes("if (normalizedPath === '/track') {"));
console.log(lines.slice(trackingIndex - 10, trackingIndex + 10).join('\n'));
