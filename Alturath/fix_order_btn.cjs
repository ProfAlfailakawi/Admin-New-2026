const fs = require('fs');
let file = fs.readFileSync('src/components/OrderPage.tsx', 'utf8');

const sMatch = file.match(/<button\s*onClick=\{\(\) => \{\s*if \(isConfirmingCancel\) return;\s*const nPaid = !isMarkedAsPaid;\s*setIsMarkedAsPaid\(nPaid\);\s*updateOrderStatus\(selectedOrder\.id, nPaid \? 'paid' : 'pending'\);\s*\}\}\s*className=\{cn\(\s*"w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95",\s*isMarkedAsPaid\s*\?"bg-emerald-600 text-white shadow-lg shadow-emerald-600\/20"\s*:"bg-slate-100 text-slate-600 hover:bg-slate-200"\s*\)\}\s*>\s*<Wallet size=\{16\} className="md:w-\[18px\]" \/>\s*\{isMarkedAsPaid \?"تم الدفع وتأكيد الحجز ✅" :"تأكيد استلام المبلغ 💰"\}\s*<\/button>/s);

if (sMatch) {
  const replacement = `<button 
  onClick={() => {
    if (isConfirmingCancel) return;
    if (!!selectedOrder.paymentLink && isMarkedAsPaid) return;
    const nPaid = !isMarkedAsPaid;
    setIsMarkedAsPaid(nPaid);
    updateOrderStatus(selectedOrder.id, nPaid ? 'paid' : 'pending');
  }}
  disabled={!!selectedOrder.paymentLink && isMarkedAsPaid}
  className={cn(
    "w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all",
    isMarkedAsPaid 
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95",
    (!!selectedOrder.paymentLink && isMarkedAsPaid) ? "cursor-not-allowed opacity-90 active:scale-100" : ""
  )}
>
  <Wallet size={16} className="md:w-[18px]" />
  {isMarkedAsPaid ? "تم الدفع وتأكيد الحجز ✅" : "تأكيد استلام المبلغ 💰"}
</button>`;
  file = file.replace(sMatch[0], replacement);
  fs.writeFileSync('src/components/OrderPage.tsx', file);
  console.log("Updated OrderPage Button");
} else {
  console.log("Could not match button in OrderPage");
}
