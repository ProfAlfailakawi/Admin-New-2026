const fs = require('fs');
function replaceLogo() {
  let app = fs.readFileSync('src/App.tsx', 'utf8');
  app = app.replace(/src=\{data\?\.settings\?\.companyLogo \|\| DEFAULT_GLOBAL_LOGO\}/g, 
    "src={data?.settings?.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}");
  app = app.replace(/logo=\{data\?\.settings\?\.companyLogo \|\| DEFAULT_GLOBAL_LOGO\}/g, 
    "logo={data?.settings?.companyLogo === '/logo.png' ? DEFAULT_GLOBAL_LOGO : (data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO)}");
  fs.writeFileSync('src/App.tsx', app);
}
replaceLogo();
