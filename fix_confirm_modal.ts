import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/ui/ConfirmModal.tsx', 'utf8');

content = content.replace(/p-3 md:p-4 md:p-3/g, 'p-4 md:p-6');

writeFileSync('src/components/ui/ConfirmModal.tsx', content);
console.log("Updated ConfirmModal");
