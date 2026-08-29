import fs from 'fs';
let content = fs.readFileSync('src/components/CustomerPage.tsx', 'utf8');
content = content.replace("Number(inv.totalAmount ?? inv.total ?? inv.amount ?? 0) || 0;", "Number(inv.totalAmount ?? (inv as any).total ?? (inv as any).amount ?? 0) || 0;");
fs.writeFileSync('src/components/CustomerPage.tsx', content);
