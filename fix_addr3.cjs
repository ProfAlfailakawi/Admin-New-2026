const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerPage.tsx', 'utf8');

code = code.replace(/setCustomerForm\(\{ name: '', phone: '', status: 'active', area: '', address: '' \}\);/g, "setCustomerForm({ name: '', phone: '', status: 'active', area: '', address: '' });");

code = code.replace(/setCustomerForm\(\{ name: c\.name, phone: c\.phone, status: c\.status, area: c\.area \|\| '' \}\);/g, "setCustomerForm({ name: c.name, phone: c.phone, status: c.status, area: c.area || '', address: c.address || '' });");

code = code.replace(/setCustomerForm\(\{ name: '', phone: '', status: 'active', area: '' \}\);/g, "setCustomerForm({ name: '', phone: '', status: 'active', area: '', address: '' });");

code = code.replace(/setCustomerForm\(\{ name: customer\.name, phone: customer\.phone, status: customer\.status, area: customer\.area \|\| '' \}\);/g, "setCustomerForm({ name: customer.name, phone: customer.phone, status: customer.status, area: customer.area || '', address: customer.address || '' });");

fs.writeFileSync('src/components/CustomerPage.tsx', code);
