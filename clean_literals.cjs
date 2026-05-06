const fs = require('fs');

const bad1 = `\${data.(settings.companyLogo === '/logo.png' || settings.companyLogo === 'logo.png' || settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}`;
const bad2 = `\${(data.settings.companyLogo === '/logo.png' || data.settings.companyLogo === 'logo.png' || data.settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

const bad3 = `\${data.(data.settings.companyLogo === '/logo.png' || data.settings.companyLogo === 'logo.png' || data.settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

const correctLiteral = `\${(data?.settings?.companyLogo === '/logo.png' || data?.settings?.companyLogo === 'logo.png' || data?.settings?.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

['src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx', 'src/components/ProductPage.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(new RegExp(bad1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctLiteral);
  content = content.replace(new RegExp(bad2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctLiteral);
  content = content.replace(new RegExp(bad3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctLiteral);
  fs.writeFileSync(file, content);
});

console.log("Replaced bad literal.");
