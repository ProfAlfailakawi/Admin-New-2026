const fs = require('fs');

const badJSX1 = `src={data.(settings.companyLogo === '/logo.png' || settings.companyLogo === 'logo.png' || settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

const badJSX2 = `src={(data.(settings.companyLogo === '/logo.png' || settings.companyLogo === 'logo.png' || settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO))}`;

const badJSX3 = `src={data.(data.settings.companyLogo === '/logo.png' || data.settings.companyLogo === 'logo.png' || data.settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

const correctJSX = `src={(data?.settings?.companyLogo === '/logo.png' || data?.settings?.companyLogo === 'logo.png' || data?.settings?.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}`;

['src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx', 'src/components/ProductPage.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(new RegExp(badJSX1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctJSX);
  content = content.replace(new RegExp(badJSX2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctJSX);
  content = content.replace(new RegExp(badJSX3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctJSX);
  fs.writeFileSync(file, content);
});

console.log("Replaced bad JSX syntax.");
