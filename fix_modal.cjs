const fs = require('fs');
let pFile = fs.readFileSync('src/components/ProductPage.tsx', 'utf8');

const modalSearch = `className="relative w-10 md:w-12 h-10 md:h-12 mt-2">
                        <img
                          src={productForm.imageUrl}
                          alt="Product"
                          className="w-full h-full object-cover rounded-xl"
                        />`;

const modalReplace = `className="relative w-20 md:w-24 h-20 md:h-24 mt-2">
                        <img
                          src={productForm.imageUrl}
                          alt="Product"
                          className="w-full h-full object-contain bg-slate-50 border border-slate-100 p-1 rounded-xl"
                        />`;

pFile = pFile.replace(modalSearch, modalReplace);
fs.writeFileSync('src/components/ProductPage.tsx', pFile);
console.log("Modal preview updated");
