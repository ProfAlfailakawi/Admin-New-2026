import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/className="text-5xl font-black/g, 'className="text-3xl md:text-5xl font-black');
content = content.replace(/min-h-\[500px\] sm:min-h-\[650px\]/g, 'min-h-[400px] md:min-h-[500px] lg:min-h-[650px]');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated Dashboard");
