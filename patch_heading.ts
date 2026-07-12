import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(/التوزيع الجغرافي للطلبات/g, 'خريطة نبض التراث');
content = content.replace(/<MapPin size=\{18\} className="text-rose-500" \/>/g, '<MapPin size={18} className="text-amber-500" />');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated heading text in Dashboard");
