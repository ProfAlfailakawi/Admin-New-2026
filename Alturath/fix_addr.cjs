const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerPage.tsx', 'utf8');
code = code.replace(/area: '' \}/g, "area: '', address: '' }");
code = code.replace(/area: customer.area \|\| '' \}/g, "area: customer.area || '', address: customer.address || '' }");
fs.writeFileSync('src/components/CustomerPage.tsx', code);
