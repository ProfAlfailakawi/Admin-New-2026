const fs = require('fs');
let code = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf8');

code = code.replace(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/g, "");

fs.writeFileSync('src/components/GeneralSettings.tsx', code);
