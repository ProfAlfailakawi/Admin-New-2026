import * as fs from 'fs';

const filePath = 'src/components/OrderPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert prepInstructions right before supplierOptions
content = content.replace(
  /(const productName = [^;]+;)/,
  '$1\n                                  const prepInstructions = product?.preparationInstructions || (item as any).preparationInstructions;'
);

// 2. Modify the product name div to include the preparation instructions
content = content.replace(
  /<div className="font-black text-slate-800 flex items-center gap-1\.5 text-\[11px\] md:text-sm">\s*\{productName\}\s*\{needsSelection && \(\s*<motion\.span/,
  `<div className="font-black text-slate-800 flex flex-col items-start gap-1.5 text-[11px] md:text-sm">
                                            <div className="flex items-center gap-1.5">
                                              {productName}
                                              {needsSelection && (
                                                <motion.span`
);

content = content.replace(
  /<\/motion\.span>\s*\)\}\s*<\/div>/,
  `</motion.span>
                                              )}
                                            </div>
                                            {prepInstructions && (
                                              <span className="text-[9px] md:text-[10px] bg-amber-100/90 border border-amber-200 text-amber-800 font-black px-2 py-1 rounded-lg mt-1 w-fit flex items-center gap-1.5 shadow-sm">
                                                <AlertCircle size={12} className="text-amber-600" />
                                                طبيعة خاصة: {prepInstructions}
                                              </span>
                                            )}
                                          </div>`
);


fs.writeFileSync(filePath, content);
console.log('Fixed OrderPage.tsx');
