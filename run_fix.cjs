const fs = require('fs');
let file = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const cutStartStr = `<div className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[750px] pr-1 sm:pr-2`;
const cutEndStr = `</motion.button>\n );\n  })}\n  </div>`;

const cutStart = file.indexOf(cutStartStr);
const cutEnd = file.indexOf("</div>\n  </div>\n\n  {/* Right: Cart & Customer */}", cutStart);

if (cutStart > -1 && cutEnd > -1) {
const replaceContent = `<div className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[750px] pr-1 sm:pr-2 custom-scrollbar">
  {filteredProducts.slice(0, 50).map(product => {
  const supplierName = data.suppliers.find(s => s.id === product.supplierId)?.name || 'غير محدد';
  return (
  <motion.button
  key={product.id}
  disabled={product.isOutOfStock}
  whileHover={!product.isOutOfStock ? { y: -2, boxShadow:"0 10px 15px -3px rgb(0 0 0 / 0.1)" } : undefined}
  whileTap={!product.isOutOfStock ? { scale: 0.98 } : undefined}
  onClick={() => !product.isOutOfStock && addToCart(product.id)}
  className={cn(
    "bg-white border p-2 sm:p-3 rounded-2xl text-right transition-all group relative flex flex-col shadow-sm md:rounded-2xl",
    product.isOutOfStock 
      ? "border-rose-100 opacity-60 grayscale-[0.6] cursor-not-allowed" 
      : "border-slate-100 hover:border-primary/50 cursor-pointer"
  )}
  >
                {/* Unified Compact Layout */}
                <div className="flex items-center justify-between gap-2 sm:gap-3 w-full relative">
                  {/* Product Image */}
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : data.settings?.companyLogo ? (
                      <img src={data.settings.companyLogo} alt="Logo" className="max-w-[70%] max-h-[70%] object-contain opacity-30 mix-blend-multiply" />
                    ) : (
                       <Package size={24} className="text-slate-300 opacity-30" />
                    )}
                  </div>
                  
                  {/* Supplier Alert */}
                  <div className="z-20 absolute -top-1 sm:-top-2 right-1 sm:right-2">
                    {getBestPriceInfo(product) && (
                      <div className="relative group/radar">
                        <div className="bg-rose-50 text-rose-500 p-1 rounded-full border border-rose-100 animate-pulse cursor-pointer shadow-sm">
                          <AlertCircle size={12} className="sm:size-[14px]" />
                        </div>
                        <div className="absolute top-0 right-full mr-1.5 hidden group-hover/radar:block bg-slate-900 text-white text-[8px] md:text-[9px] p-2.5 rounded-xl z-[100] whitespace-nowrap shadow-2xl font-bold border border-white/10 ring-4 ring-rose-500/10">
                          انتبه! المورد ({getBestPriceInfo(product)?.supplier}) <br/>
                          يبيعه أرخص بسعر {Number(getBestPriceInfo(product)?.cost || 0).toFixed(3)} د.ك
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center h-full">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[13px] sm:text-[15px] text-slate-800 line-clamp-2 text-right leading-tight mb-1">{product.name}</h3>
                      <div className="text-[10px] text-slate-400 truncate font-bold shrink-0">{supplierName}</div>
                    </div>
                    <div className="flex items-center justify-between w-full mt-auto">
                        <div className="text-primary font-black text-[14px] sm:text-[16px] tracking-tighter">
                          {Number(product.price || 0).toFixed(3)} <span className="text-[9px] sm:text-[10px]">د.ك</span>
                        </div>
                        <div className="bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white p-1.5 sm:p-2 border border-slate-100 group-hover:border-primary rounded-xl transition-all shadow-sm">
                          <Plus size={14} className="sm:size-[16px]" />
                        </div>
                    </div>
                  </div>
                  
                </div>
              </motion.button>
 );
  })}
  </div>
  </div>
  </div>\n\n  `;

    const newFile = file.slice(0, cutStart) + replaceContent + file.slice(cutEnd);
    fs.writeFileSync('src/components/InvoicePage.tsx', newFile);
  console.log("InvoicePage replaced successfully with compact horizontal layout!!");
} else {
    console.log("Failed. cutStart:", cutStart, "cutEnd:", cutEnd);
}
