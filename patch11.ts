import fs from 'fs';

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

content = content.replace(
  '<Database size={18} />',
  '<Database size={16} />'
);

fs.writeFileSync('src/components/Dashboard.tsx', content);

console.log("Database icon size updated.");
