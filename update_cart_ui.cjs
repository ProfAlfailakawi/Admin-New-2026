const fs = require('fs');
let content = fs.readFileSync('src/components/InvoicePage.tsx', 'utf8');

const search = ` </div>
 </div>
 </div>
 ))}
 {cartItems.length === 0 && (`;

const replace = ` </div>
 </div>
 
 {/* Addons Selection UI */}
 {item.product?.addons && item.product.addons.length > 0 && (
     <div className="mt-3 pt-3 border-t border-slate-100">
         <p className="text-[10px] font-bold text-slate-400 mb-2">إضافات متاحة للطلب:</p>
         <div className="flex flex-wrap gap-2">
             {item.product.addons.map(addon => {
                 const isSelected = item.addons.some(a => a.id === addon.id);
                 return (
                     <button
                         key={addon.id}
                         onClick={() => {
                             if (isPaid) return;
                             setCart(prev => {
                                 const existingCartItem = prev[item.product!.id];
                                 if (!existingCartItem) return prev;
                                 let newAddons = [...(existingCartItem.addons || [])];
                                 if (isSelected) {
                                     newAddons = newAddons.filter(a => a.id !== addon.id);
                                 } else {
                                     newAddons.push(addon);
                                 }
                                 return {
                                     ...prev,
                                     [item.product!.id]: {
                                         ...existingCartItem,
                                         addons: newAddons
                                     }
                                 };
                             });
                         }}
                         className={\`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 \${isSelected ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}\`}
                     >
                         <span>{addon.name}</span>
                         {!addon.isHiddenPrice && addon.price > 0 && (
                             <span className={isSelected ? "text-white/80" : "text-slate-400"}>
                                 (+{Number(addon.price).toFixed(3)})
                             </span>
                         )}
                     </button>
                 );
             })}
         </div>
     </div>
 )}

 </div>
 ))}
 {cartItems.length === 0 && (`;

content = content.replace(search, replace);
fs.writeFileSync('src/components/InvoicePage.tsx', content);
