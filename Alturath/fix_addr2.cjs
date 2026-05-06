const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerPage.tsx', 'utf8');

const replacement = ` <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">المنطقة</label>
 <input 
 type="text" 
 value={customerForm.area}
 onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 placeholder="أدخل المنطقة (اختياري)..."
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">العنوان</label>
 <textarea 
 value={customerForm.address}
 onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right resize-none h-20"
 placeholder="أدخل تفاصيل العنوان (مثال: قطعة 1، شارع 2...)"
 />
 </div>`;

code = code.replace(/<div className="space-y-2">\s*<label className="text-xs font-black text-slate-400 uppercase mr-1 block">المنطقة<\/label>\s*<input[^>]+value=\{customerForm\.area\}[^>]+onChange=\{[^>]+>[^>]+<\/div>/, replacement);

fs.writeFileSync('src/components/CustomerPage.tsx', code);
