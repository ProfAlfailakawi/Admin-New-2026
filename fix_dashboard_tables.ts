import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/<table className="w-full text-right"/g, '<table className="w-full text-right min-w-[500px]"');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated Dashboard tables");
