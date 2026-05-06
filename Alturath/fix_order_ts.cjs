const fs = require('fs');
let file = fs.readFileSync('src/components/OrderPage.tsx', 'utf8');

file = file.replace(/!!selectedOrder\.paymentLink/g, '!!(selectedOrder as any).paymentLink');

fs.writeFileSync('src/components/OrderPage.tsx', file);
