const fs = require('fs');
let file = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');

file = file.replace(/inv\.paymentId/g, 'inv.paymentLink');

fs.writeFileSync('src/components/ReportsPage.tsx', file);
