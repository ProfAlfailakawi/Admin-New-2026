import fs from 'fs';
let content = fs.readFileSync('src/components/CustomerPage.tsx', 'utf8');
content = content.replace("inv.total || inv.amount || 0", "(inv as any).total || (inv as any).amount || 0");
content = content.replace("inv.total || inv.amount || 0", "(inv as any).total || (inv as any).amount || 0"); // Replace again in case there are multiple
fs.writeFileSync('src/components/CustomerPage.tsx', content);
