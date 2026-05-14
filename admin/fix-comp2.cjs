const fs = require('fs');

let content = fs.readFileSync('src/components/CustomerPage.tsx', 'utf-8');

const regex = /setAnalyzingCustomer\([\s\S]*?scale:\ 1\,\ y:\ 0\ \}\}/;

const newContent = `setAnalyzingCustomer(null);
  }}
  className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-emerald-600/30"
  >
  <TrendingUp size={18} /> تشغيل استمارة اقتراح بيع إضافي (Up-sell)
  </button>
  </div>
)}
 </>
);
 })()}
 </div>
 
 <div className="p-3 md:p-4 shrink-0 mt-auto border-t border-slate-50 bg-slate-50/30">
 <button 
 onClick={() => setAnalyzingCustomer(null)}
 className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all outline-none text-base leading-none"
 >
 إغلاق
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>

 <AnimatePresence>
  {showTestimonials && (
   <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }} 
    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 md:p-8"
    onClick={() => setShowTestimonials(false)}
   >
    <motion.div 
     initial={{ opacity: 0, scale: 0.9, y: 40 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}`;

const match = regex.exec(content);
if (match) {
  content = content.replace(regex, newContent);
  fs.writeFileSync('src/components/CustomerPage.tsx', content);
  console.log("Replaced with regex!!")
  
  if(!content.includes("const StatCard:")) {
    let lines = content.split('\\n');
    let exportLineIndex = lines.findIndex(l => l.includes('export default CustomerPage;'));
    if(exportLineIndex !== -1) {
       const statCardImpl = `
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; description?: string }> = ({ label, value, icon, color, description }) => {
 const colorMap: Record<string, string> = {
 blue: 'bg-blue-50 text-blue-600 border-blue-100',
 emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
 amber: 'bg-amber-50 text-amber-600 border-amber-100',
 red: 'bg-red-50 text-red-600 border-red-100',
 indigo: 'bg-zinc-50 text-indigo-600 border-indigo-100',
 accent: 'bg-indigo-50 text-indigo-600 border-indigo-100'
 };

 return (
 <div className={cn("p-2 md:p-4 rounded-xl md:rounded-2xl border text-right flex flex-col justify-center group", colorMap[color] || colorMap['blue'])}>
 <div className="flex justify-between items-start md:items-center mb-1 md:mb-2 flex-row-reverse">
 <div className="w-6 h-6 md:w-10 md:h-10 shrink-0 rounded-lg md:rounded-xl bg-white border border-inherit flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
 {icon}
 </div>
 <div className="text-[9px] md:text-[10px] font-black uppercase opacity-60 max-w-[70%] leading-tight">{label}</div>
 </div>
 <div>
 <div className="text-sm md:text-2xl font-black tracking-tighter mb-0.5">{value}</div>
 {description && <div className="text-[8px] md:text-[10px] font-bold opacity-40 line-clamp-1">{description}</div>}
 </div>
 </div>
 );
};`;
       lines.splice(exportLineIndex, 0, statCardImpl);
       fs.writeFileSync('src/components/CustomerPage.tsx', lines.join('\\n'));
       console.log("Added statCard back");
    }
  }

} else {
  console.log("Match not found!");
}
