const fs = require('fs');

function cleanFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  const correctLiteral = '${(data.settings?.companyLogo === "/logo.png" || data.settings?.companyLogo === "logo.png" || data.settings?.companyLogo === "./logo.png") ? DEFAULT_GLOBAL_LOGO : (data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}';

  const correctJSXData = '{(data?.settings?.companyLogo === "/logo.png" || data?.settings?.companyLogo === "logo.png" || data?.settings?.companyLogo === "./logo.png") ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}';

  const correctJSXSettings = '{(settings.companyLogo === "/logo.png" || settings.companyLogo === "logo.png" || settings.companyLogo === "./logo.png") ? DEFAULT_GLOBAL_LOGO : (settings.companyLogo || DEFAULT_GLOBAL_LOGO)}';

  // For InvoicePage & ReportsPage strings
  content = content.replace(/src="\$\{data\.\(settings\.companyLogo[\s\S]*?DEFAULT_GLOBAL_LOGO\)\}"/g, `src="${correctLiteral}"`);

  // GeneralSettings.tsx
  content = content.replace(/src=\{settings\.\(companyLogo ===[\s\S]*?DEFAULT_GLOBAL_LOGO\)\}/g, `src=${correctJSXSettings}`);
  content = content.replace(/src=\{\(\(settings\.companyLogo[\s\S]*?DEFAULT_GLOBAL_LOGO\)\}/g, `src=${correctJSXSettings}`);

  fs.writeFileSync(file, content);
}

['src/components/GeneralSettings.tsx', 'src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx', 'src/components/ProductPage.tsx'].forEach(cleanFile);
