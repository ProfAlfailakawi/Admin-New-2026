import * as fs from 'fs';

const filePath = 'src/components/OrderPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const t2 = `                                  const productName = product?.name || (item as any).name || (item as any).productName || 'منتج غير معروف';`;
const r2 = `                                  const productName = product?.name || (item as any).name || (item as any).productName || 'منتج غير معروف';\n                                  const prepInstructions = product?.preparationInstructions;`;

const t3 = `                                          <div className="font-black text-slate-800 flex items-center gap-1.5 text-[11px] md:text-sm">
                                            {productName}
                                            {needsSelection && (`;
const r3 = `                                          <div className="font-black text-slate-800 flex flex-col items-start gap-1.5 text-[11px] md:text-sm">
                                            <div className="flex items-center gap-1.5">
                                              {productName}
                                              {needsSelection && (`;

const t4 = `                                              </motion.span>
                                            )}
                                          </div>`;
const r4 = `                                              </motion.span>
                                            )}
                                            </div>
                                            {prepInstructions && (
                                              <span className="text-[9px] md:text-[10px] bg-amber-100/90 border border-amber-200 text-amber-800 font-black px-2 py-1 rounded-lg mt-1 w-fit flex items-center gap-1.5 shadow-sm">
                                                <AlertCircle size={12} className="text-amber-600" />
                                                طبيعة خاصة: {prepInstructions}
                                              </span>
                                            )}
                                          </div>`;

if (content.includes(t2)) content = content.replace(t2, r2);
else console.log('T2 missing');

if (content.includes(t3)) content = content.replace(t3, r3);
else console.log('T3 missing');

if (content.includes(t4)) content = content.replace(t4, r4);
else console.log('T4 missing');

fs.writeFileSync(filePath, content);
console.log('Fixed OrderPage');
