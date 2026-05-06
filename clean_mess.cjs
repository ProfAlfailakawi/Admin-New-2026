const fs = require('fs');

const ugly1 = `(data?.settings?.companyLogo === '/logo.png' || data?.settings?.companyLogo === 'logo.png' || data?.settings?.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)`;
const nice1 = `data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO`;

const ugly2 = `(settings.companyLogo === '/logo.png' || settings.companyLogo === 'logo.png' || settings.companyLogo === './logo.png') ? DEFAULT_GLOBAL_LOGO : (settings.companyLogo || DEFAULT_GLOBAL_LOGO)`;
const nice2 = `settings.companyLogo || DEFAULT_GLOBAL_LOGO`;

const ugly3 = `(settings.companyLogo === "/logo.png" || settings.companyLogo === "logo.png" || settings.companyLogo === "./logo.png") ? DEFAULT_GLOBAL_LOGO : (settings.companyLogo || DEFAULT_GLOBAL_LOGO)`;

['src/App.tsx', 'src/components/GeneralSettings.tsx', 'src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx', 'src/components/ProductPage.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(new RegExp(ugly1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), nice1);
  content = content.replace(new RegExp(ugly2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), nice2);
  content = content.replace(new RegExp(ugly3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), nice2);
  fs.writeFileSync(file, content);
});
console.log("Restored nice syntax.");
