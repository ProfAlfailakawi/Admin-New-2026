const fs = require('fs');
let file = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');

const s1Match = file.match(/\{\(inv\.paymentLink \|\| inv\.paymentStatus\) && \(\s*<button\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleTogglePaymentStatus\(inv\.id, inv\.paymentStatus\); \}\}\s*className=\{cn\(\s*"px-3 py-1 text-\[10px\] font-black rounded-lg transition-all",\s*isPaidStatus\(inv\.paymentStatus\) \?"bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :"bg-amber-100 text-amber-700 hover:bg-amber-200"\s*\)\}\s*>\s*\{isPaidStatus\(inv\.paymentStatus\) \? 'مدفوع ✓' : 'في إنتظار الدفع ⏳'\}\s*<\/button>\s*\)\}/s);

if (s1Match) {
  const r1 = `{(inv.paymentLink || inv.paymentStatus) && (
  <button
  onClick={(e) => { 
    e.stopPropagation(); 
    if (inv.paymentId && isPaidStatus(inv.paymentStatus)) return; // Prevent unlocking real UPI payments
    handleTogglePaymentStatus(inv.id, inv.paymentStatus); 
  }}
  disabled={!!inv.paymentId && isPaidStatus(inv.paymentStatus)}
  className={cn(
 "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
 isPaidStatus(inv.paymentStatus) ?"bg-emerald-100 text-emerald-700" :"bg-amber-100 text-amber-700 hover:bg-amber-200",
 (!!inv.paymentId && isPaidStatus(inv.paymentStatus)) ? "cursor-not-allowed opacity-90" : ""
)}
  >
  {isPaidStatus(inv.paymentStatus) ? 'مدفوع ✓' : 'في إنتظار الدفع ⏳'}
  </button>
)}`;
  file = file.replace(s1Match[0], r1);
  console.log("Replaced s1");
}

fs.writeFileSync('src/components/ReportsPage.tsx', file);
