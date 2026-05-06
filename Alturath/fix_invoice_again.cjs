const fs = require('fs');

let iFile = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const iSearch = `                <div className="flex flex-col h-full w-full">
                 {/* No Image - Compact Card */}
                   {/* Alerts Top Left */}`;

// Let's use regex
const regex = /<div className="flex flex-col h-full w-full">\s*\{\/\* No Image - Compact Card \*\/\}\s*\{\/\* Alerts Top Left \*\/\}/;

const iReplace = `<div className="flex flex-col h-full w-full">
                  {/* Fixed Image */}
                  <div className="relative w-full mb-3 shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-[140px] object-cover rounded-[12px]" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                       <div className="w-full h-[140px] bg-[#f3f4f6] rounded-[12px] flex items-center justify-center">
                           <img src={DEFAULT_GLOBAL_LOGO} alt="Default Logo" className="opacity-20 object-contain w-12 h-12" referrerPolicy="no-referrer" />
                       </div>
                    )}
                    
                    {/* Alerts Over Image */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 z-20">`;


iFile = iFile.replace(/<div className="flex flex-col h-full w-full">\s*\{\/\* No Image - Compact Card \*\/\}\s*\{\/\* Alerts Top Left \*\/\}\s*\{getBestPriceInfo\(product\) && \(\s*<div className="absolute top-2 left-2 flex items-center gap-1 z-20">/, 
`<div className="flex flex-col h-full w-full">
                  {/* Fixed Image */}
                  <div className="relative w-full mb-3 shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-[140px] object-cover rounded-[12px]" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                       <div className="w-full h-[140px] bg-[#f3f4f6] rounded-[12px] flex items-center justify-center">
                           <img src={DEFAULT_GLOBAL_LOGO} alt="Default Logo" className="opacity-20 object-contain w-12 h-12" referrerPolicy="no-referrer" />
                       </div>
                    )}
                    
                    {/* Alerts Over Image */}
                    {getBestPriceInfo(product) && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 z-20">`);

fs.writeFileSync('src/components/InvoicePage.tsx', iFile);
console.log("InvoicePage fixed");
