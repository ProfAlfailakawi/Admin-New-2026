import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/PromoCodePage.tsx', 'utf8');

content = content.replace(/<table className="w-full text-right">/g, '<table className="w-full text-right min-w-[700px]">');

writeFileSync('src/components/PromoCodePage.tsx', content);
console.log("Updated PromoCodePage table");
