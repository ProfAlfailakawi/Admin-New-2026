const fs = require('fs');

const correctLiteral = '${(data?.settings?.companyLogo === \'/logo.png\' || data?.settings?.companyLogo === \'logo.png\' || data?.settings?.companyLogo === \'./logo.png\') ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}';

const components = ['src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx'];

components.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<img src="\$\{data\.\([^"]+\)"/g, `<img src="${correctLiteral}"`);
  content = content.replace(/<img src="\$\{\(data\.\([^"]+\)"/g, `<img src="${correctLiteral}"`);
  content = content.replace(/<img src="\$\{data\.settings\.companyLogo === '[^"]+"\}/g, `<img src="${correctLiteral}"`);
  fs.writeFileSync(file, content);
});

// App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
// should be fine as it was, but let's make sure
fs.writeFileSync('src/App.tsx', appContent);
