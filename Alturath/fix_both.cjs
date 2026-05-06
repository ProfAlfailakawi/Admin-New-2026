const fs = require('fs');

// 1) Fix ProductPage.tsx
let pFile = fs.readFileSync('src/components/ProductPage.tsx', 'utf8');

const pSearch = `<div className="relative h-24 sm:h-28 w-full overflow-hidden bg-white flex items-center justify-center border-b border-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply p-2 group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full p-6 flex items-center justify-center bg-slate-50">
                        <img
                          src={
                            data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO
                          }
                          alt="Logo"
                          className="max-w-[60%] max-h-[60%] object-contain opacity-20 transition-opacity duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}`;

const pReplace = `                  <div className="relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-[140px] object-cover rounded-[12px]"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-[140px] flex items-center justify-center bg-[#f3f4f6] rounded-[12px]">
                        <img
                          src={
                            data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO
                          }
                          alt="Logo"
                          className="max-w-[40%] max-h-[40%] object-contain opacity-20 transition-opacity duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}`;

if(pFile.includes(pSearch)) {
    pFile = pFile.replace(pSearch, pReplace);
    fs.writeFileSync('src/components/ProductPage.tsx', pFile);
    console.log("ProductPage fixed");
} else {
    console.log("ProductPage template not found!");
}

// 2) Fix InvoicePage.tsx
let iFile = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const iSearch = `                <div className="flex flex-col h-full w-full">
                 {/* No Image - Compact Card */}
                   {/* Alerts Top Left */}`;

const iReplace = `                <div className="flex flex-col h-full w-full">
                  {/* Fixed Image */}
                  <div className="relative w-full mb-3 shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-[140px] object-cover rounded-[12px]" 
                      />
                    ) : (
                       <div className="w-full h-[140px] bg-[#f3f4f6] rounded-[12px] flex items-center justify-center">
                           <img src={DEFAULT_GLOBAL_LOGO} alt="Default Logo" className="opacity-20 object-contain w-12 h-12" />
                       </div>
                    )}
                    
                    {/* Alerts Over Image */}`;

if(iFile.includes(iSearch)) {
    iFile = iFile.replace(iSearch, iReplace);
    fs.writeFileSync('src/components/InvoicePage.tsx', iFile);
    console.log("InvoicePage fixed");
} else {
    console.log("InvoicePage template not found!");
}
