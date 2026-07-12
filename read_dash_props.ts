import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const lines = content.split('\n');
console.log("Props definition:");
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('export default function Dashboard') || lines[i].includes('const Dashboard =')) {
    console.log(lines.slice(i, i+20).join('\n'));
    break;
  }
}
