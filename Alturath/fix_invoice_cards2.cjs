const fs = require('fs');
let file = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const regex = /\{\/\* Desktop Layout \*\/\}.*?<\/div>\r?\n\r?\n\s*\{\/\* Mobile Compact Layout \*\/\}.*?<\/div>\r?\n\s*<\/motion.button>/s;

const replace = `                <div className="flex flex-col h-full w-full">
                  {/* Main Image Area Top */}
                  <div className="relative h-24 sm:h-28 w-full mb-2 sm:mb-3 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-contain mix-blend-multiply p-1 sm:p-2 group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : data.settings?.companyLogo ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={data.settings.companyLogo} alt="Logo" className="max-w-[50%] max-h-[50%] object-contain opacity-20 mix-blend-multiply group-hover:opacity-30 transition-opacity" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={DEFAULT_GLOBAL_LOGO} alt="Default Logo" className="max-w-[50%] max-h-[50%] object-contain opacity-20 mix-blend-multiply group-hover:opacity-30 transition-opacity" />
                      </div>
                    )}
                    
                    {/* Alerts Over Image */}
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex items-center gap-1 z-20">
                      {getBestPriceInfo(product) && (
                        <div className="relative group/radar pointer-events-auto">
                          <div className="bg-rose-50 hover:bg-rose-100 rounded-full text-rose-500 hover:text-rose-600 p-1 sm:p-1.5 transition-all cursor-pointer animate-pulse border border-rose-100 shadow-sm">
                            <AlertCircle size={12} className="sm:size-[14px]" />
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden group-hover/radar:block bg-slate-900 text-white text-[9px] sm:text-[10px] p-2 sm:p-2.5 rounded-xl z-[100] whitespace-nowrap shadow-xl font-bold border border-white/10 ring-4 ring-rose-500/10">
                            انتبه! المورد ({getBestPriceInfo(product)?.supplier}) <br/>
                            يبيعه أرخص بسعر {Number(getBestPriceInfo(product)?.cost || 0).toFixed(3)} د.ك
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 pl-0.5 sm:pl-1 pr-0.5 sm:pr-1">
                    <h3 className="font-bold text-slate-800 text-[12.5px] sm:text-[15px] leading-tight mb-1 line-clamp-2 break-words text-right min-h-[30px] sm:min-h-[36px]">
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto space-y-1.5 pt-1">
                      <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1">
                        المورد: <span className="text-slate-500 truncate max-w-[100px] sm:max-w-[120px]">{supplierName}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1 pt-1.5 sm:pt-2 border-t border-slate-50">
                        <div className="text-primary font-black text-[14px] sm:text-lg tracking-tighter">
                          {Number(product.price || 0).toFixed(3)} <span className="text-[9px] sm:text-[10px]">د.ك</span>
                        </div>
                        <div className="text-slate-400 group-hover:text-white group-hover:bg-primary transition-all bg-slate-50 rounded-xl p-1.5 sm:p-1.5 shadow-sm">
                          <Plus size={14} className="sm:size-[18px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>`;

let newFile = file.replace(regex, replace);
if(newFile !== file) {
  fs.writeFileSync('src/components/InvoicePage.tsx', newFile);
  console.log('InvoicePage Unified.');
} else {
  console.log('InvoicePage Not unified. Search string mismatch.');
}
