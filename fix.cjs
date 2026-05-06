const fs = require('fs');

let file1 = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const searchMobile = `{/* Mobile Compact Layout */}
 <div className="md:hidden flex items-center justify-between gap-1 w-full relative">
 {/* Supplier Alert mobile */}
 <div className="z-20">`;

const replaceMobile = `{/* Mobile Compact Layout */}
 <div className="md:hidden flex items-center justify-between gap-2 w-full relative">
 {/* Product Image Mobile */}
 <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
 {product.imageUrl ? (
 <img 
 src={product.imageUrl} 
 alt={product.name} 
 className="w-full h-full object-contain mix-blend-multiply" 
 />
 ) : data.settings?.companyLogo ? (
 <img src={data.settings.companyLogo} alt="Logo" className="w-full h-full object-contain opacity-30 mix-blend-multiply" />
 ) : (
 <img src={DEFAULT_GLOBAL_LOGO} alt="Default Logo" className="w-full h-full object-contain opacity-30 mix-blend-multiply" />
 )}
 </div>
 
 {/* Supplier Alert mobile */}
 <div className="z-20">`;

let newFile1 = file1.replace(searchMobile, replaceMobile);
if (file1 !== newFile1) {
  console.log('Mobile layout InvoicePage replaced successfully');
  fs.writeFileSync('src/components/InvoicePage.tsx', newFile1);
} else {
  console.log('Mobile layout InvoicePage NOT replaced. Could not find search string.');
}

const searchDesktop = `<div className="relative h-32 sm:h-40 w-full mb-3 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
 {product.imageUrl ? (
 <img 
 src={product.imageUrl} 
 alt={product.name} 
 className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" 
 />
) : data.settings?.companyLogo ? (`;

const replaceDesktop = `<div className="relative h-24 w-full mb-3 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center">
 {product.imageUrl ? (
 <img 
 src={product.imageUrl} 
 alt={product.name} 
 className="w-full h-full object-contain mix-blend-multiply p-1 group-hover:scale-105 transition-transform duration-500" 
 />
) : data.settings?.companyLogo ? (`;

let newFile1_2 = newFile1.replace(searchDesktop, replaceDesktop);
if (newFile1 !== newFile1_2) {
  console.log('Desktop layout InvoicePage replaced successfully');
  fs.writeFileSync('src/components/InvoicePage.tsx', newFile1_2);
} else {
  console.log('Desktop layout InvoicePage NOT replaced.');
}

let file2 = fs.readFileSync('src/components/ProductPage.tsx', 'utf8');

const searchProductCode1 = `<div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />`;

const replaceProductCode1 = `<div className="relative h-24 sm:h-28 w-full overflow-hidden bg-white flex items-center justify-center border-b border-slate-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply p-2 group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />`;

let newFile2 = file2.replace(searchProductCode1, replaceProductCode1);
if (file2 !== newFile2) {
  console.log('ProductPage product layout replaced successfully');
  fs.writeFileSync('src/components/ProductPage.tsx', newFile2);
} else {
  console.log('ProductPage product layout NOT replaced.');
}
