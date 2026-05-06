const fs = require('fs');
function replaceLogoMore() {
  let app = fs.readFileSync('src/App.tsx', 'utf8');
  app = app.replace(/data\?\.settings\?\.companyLogo === '\/logo\.png'/g, 
    "(data?.settings?.companyLogo === '/logo.png' || data?.settings?.companyLogo === 'logo.png' || data?.settings?.companyLogo === './logo.png')");
  fs.writeFileSync('src/App.tsx', app);

  ['src/components/GeneralSettings.tsx', 'src/components/InvoicePage.tsx', 'src/components/ReportsPage.tsx', 'src/components/ProductPage.tsx'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/settings\.companyLogo === '\/logo\.png'/g, 
      "(settings.companyLogo === '/logo.png' || settings.companyLogo === 'logo.png' || settings.companyLogo === './logo.png')");
    content = content.replace(/data\.settings\.companyLogo === '\/logo\.png'/g, 
      "(data.settings.companyLogo === '/logo.png' || data.settings.companyLogo === 'logo.png' || data.settings.companyLogo === './logo.png')");
    content = content.replace(/data\?\.settings\?\.companyLogo === '\/logo\.png'/g, 
      "(data?.settings?.companyLogo === '/logo.png' || data?.settings?.companyLogo === 'logo.png' || data?.settings?.companyLogo === './logo.png')");
    fs.writeFileSync(file, content);
  });
}
replaceLogoMore();
