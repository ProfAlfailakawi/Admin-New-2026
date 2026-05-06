const fs = require('fs');
let file = fs.readFileSync('src/components/ReportsPage.tsx', 'utf8');

const sMatch = file.match(/\{\(inv\.paymentLink \|\| inv\.paymentStatus\) && \(\s*<button[\s\S]*?<\/button>\s*\)\}/s);

if (sMatch) {
  const replacement = `   <button
   onClick={(e) => { 
     e.stopPropagation(); 
     if (inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)) return;
     handleTogglePaymentStatus(inv.id, inv.paymentStatus as string || (inv as any).status); 
   }}
   disabled={!!inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)}
   className={cn(
  "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
  isPaidStatus(inv.paymentStatus as string || (inv as any).status) ?"bg-emerald-100 text-emerald-700" :"bg-amber-100 text-amber-700 hover:bg-amber-200",
  (!!inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)) ? "cursor-not-allowed opacity-90" : ""
 )}
   >
   {isPaidStatus(inv.paymentStatus as string || (inv as any).status) ? 'مدفوع ✓' : 'في إنتظار الدفع ⏳'}
   </button>`;
  file = file.replace(sMatch[0], replacement);
  fs.writeFileSync('src/components/ReportsPage.tsx', file);
  console.log("Updated ReportsPage Button");
} else {
  console.log("Could not match button in ReportsPage");
}
