const fs = require('fs');
function replaceLogo(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
  fs.writeFileSync(file, content);
}
replaceLogo('src/components/GeneralSettings.tsx', 
  "src={settings.companyLogo || DEFAULT_GLOBAL_LOGO}", 
  "src={settings.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (settings.companyLogo || DEFAULT_GLOBAL_LOGO)}");

replaceLogo('src/components/InvoicePage.tsx', 
  "src=\"${data.settings.companyLogo || DEFAULT_GLOBAL_LOGO}\"", 
  "src=\"${data.settings.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}\"");

replaceLogo('src/components/InvoicePage.tsx', 
  "src={data.settings.companyLogo || DEFAULT_GLOBAL_LOGO}", 
  "src={data.settings.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}");

replaceLogo('src/components/ReportsPage.tsx', 
  "src=\"${data.settings.companyLogo || DEFAULT_GLOBAL_LOGO}\"", 
  "src=\"${data.settings.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data.settings.companyLogo || DEFAULT_GLOBAL_LOGO)}\"");

replaceLogo('src/components/ProductPage.tsx', 
  "data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO", 
  "data?.settings?.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)");
