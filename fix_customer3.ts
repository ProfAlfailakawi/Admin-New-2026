import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/InvoicePage.tsx', 'utf8');

const target2 = `  </MagneticButton>
  </div>
  </div>
  </div>
  </div>
  );
});`;

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
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-right">إضافة عميل جديد</h3>
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
                  toast.error('يرجى إدخال اسم العميل ورقم الهاتف');
                  return;
              }
              const newId = \`cust_\${Date.now()}\`;
              const newCustomer: Customer = {
                  id: newId,
                  name: quickCustomerName.trim(),
                  phone: quickCustomerPhone.trim(),
                  status: 'active',
                  totalOrders: 0,
                  totalSpent: 0
              };
              const updatedCustomers = [...(data.customers || []), newCustomer];
              setData(prev => ({ ...prev, customers: updatedCustomers }));
              setSelectedCustomerId(newId);
              setCustomerSearch(newCustomer.name);
              setShowQuickCustomerModal(false);
              toast.success('تم إضافة العميل بنجاح');
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

content = content.split('  </MagneticButton>\n  </div>\n  </div>\n  </div>\n  </div>\n  );\n});').join(replacement2);

writeFileSync('src/components/InvoicePage.tsx', content);
