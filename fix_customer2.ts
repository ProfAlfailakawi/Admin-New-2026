import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

const replacement1 = `{data.customers.filter(c => {
  const normalizedQuery = normalizeArabic(customerSearch);
  return normalizeArabic(c.name || '').includes(normalizedQuery) || (c.phone || '').includes(customerSearch);
  }).length === 0 && (
  <div className="p-4 text-center border-t border-slate-100">
  <div className="text-slate-500 mb-3 font-bold text-sm">لا يوجد عميل بهذا الاسم</div>
  <button 
  type="button"
  onClick={(e) => {
  e.stopPropagation();
  setQuickCustomerName(customerSearch);
  setQuickCustomerPhone('');
  setShowQuickCustomerModal(true);
  setShowCustomerDropdown(false);
  }}
  className="bg-primary/10 hover:bg-primary/20 text-primary font-bold py-3 px-4 rounded-xl transition-colors w-full flex justify-center items-center gap-2"
  >
  <Plus size={16} /> إضافة مسودة عميل جديد
  </button>
  </div>
 )}`;

content = content.replace(/{data\.customers\.filter\(c[^]+?لا يوجد عميل بهذا الاسم<\/div>\s+\)}/, replacement1);

const replacement2 = `  </MagneticButton>
  </div>
  </div>
  </div>

  {/* Quick Customer Modal */}
  <AnimatePresence>
  {showQuickCustomerModal && (
  <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
      dir="rtl"
      >
      <div className="p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-right">إضافة مسودة لعميل جديد</h3>
          <div className="space-y-4">
          <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 text-right block">اسم العميل (مطلوب)</label>
              <input
              type="text"
              value={quickCustomerName}
              onChange={(e) => setQuickCustomerName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800"
              placeholder="اسم العميل..."
              />
          </div>
          <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 text-right block">رقم الهاتف (مطلوب)</label>
              <input
              type="tel"
              value={quickCustomerPhone}
              onChange={(e) => setQuickCustomerPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-left cursor-text ltr-input"
              placeholder="+965"
              dir="ltr"
              />
          </div>
          </div>
          <div className="flex gap-3 mt-8">
          <button
              type="button"
              onClick={() => setShowQuickCustomerModal(false)}
              className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
          >
              إلغاء
          </button>
          <button
              type="button"
              onClick={() => {
              if (!quickCustomerName.trim() || !quickCustomerPhone.trim()) {
                  import('sonner').then(({ toast }) => toast.error('يرجى إدخال اسم العميل ورقم الهاتف'));
                  return;
              }
              const newId = \`cust_\${Date.now()}\`;
              const newCustomer = {
                  id: newId,
                  name: quickCustomerName.trim(),
                  phone: quickCustomerPhone.trim(),
                  status: 'active' as any,
                  totalOrders: 0,
                  totalSpent: 0
              };
              const updatedCustomers = [...(data.customers || []), newCustomer];
              setData(prev => ({ ...prev, customers: updatedCustomers }));
              setSelectedCustomerId(newId);
              setCustomerSearch(newCustomer.name);
              setShowQuickCustomerModal(false);
              import('sonner').then(({ toast }) => toast.success('تم إضافة العميل بنجاح'));
              }}
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
              إضافة العميل
          </button>
          </div>
      </div>
      </motion.div>
  </div>
  )}
  </AnimatePresence>

  </div>
  );
});`;

content = content.replace(/<\/MagneticButton>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*}\);\s*$/, replacement2);
writeFileSync('src/components/InvoicePage.tsx', content);
