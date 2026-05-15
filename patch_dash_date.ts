import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. the old time machine code
content = content.replace(
  /const \[timeMachineMode, setTimeMachineMode\].*?\}, \[rawData, timeMachineMode\]\);/s,
  "const data = rawData;"
);

// 2. The old top filter
const topFilterStr = `{/* FILTER - Underneath Tabs */}
          <div className="flex gap-2 w-full overflow-x-auto scrollbar-hide py-1 mt-4 shrink-0">
            {["day", "week", "month", "year", "all"].map((tf) => (
              <button
                key={tf}
                onClick={() => startTransition(() => setDateFilter(tf as any))}
                className={cn(
                  "flex-1 min-w-max flex items-center justify-center px-4 py-3.5 rounded-2xl text-[12px] uppercase font-bold transition-all duration-300 outline-none whitespace-nowrap border border-slate-200/60",
                  dateFilter === tf
                    ? "border-slate-800 text-slate-900 bg-white shadow-sm ring-1 ring-slate-800"
                    : "border-transparent text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                {tf === "day"
                  ? "يوم"
                  : tf === "week"
                    ? "أسبوع"
                    : tf === "month"
                      ? "شهر"
                      : tf === "year"
                        ? "سنة"
                        : "الكل"}
              </button>
            ))}
          </div>`;

content = content.replace(topFilterStr, '');

// 3. Replace the actual time machine UI at the bottom
const oldBottomTimeMachineStr = `{/* آلة الزمن المالي (Financial Time Machine) */}
        <div className="fixed bottom-0 md:bottom-4 left-0 right-0 md:left-auto md:right-1/2 md:translate-x-1/2 z-[100] p-4 flex justify-center pointer-events-none fade-in animate-in slide-in-from-bottom-10 duration-700 delay-1000">
          <div className="glass-dark rounded-3xl md:rounded-full p-4 flex flex-col items-center gap-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] pointer-events-auto w-full md:w-[700px] border border-white/10">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2 text-white shrink-0">
                <History className="opacity-70 text-amber-400 animate-spin-slow" size={16} />
                <span className="font-bold text-[10px] md:text-sm uppercase tracking-[0.2em] text-amber-500 font-mono">الزمن المالي</span>
              </div>
              
              <div className="text-[10px] md:text-xs font-bold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {timeMachineMode === 0 ? 'الوقت الفعلي (مباشر)' : \`العودة للوراء: \${timeMachineMode === 1 ? 'شهر' : timeMachineMode === 2 ? '3 أشهر' : timeMachineMode === 3 ? '6 أشهر' : 'سنة'}\`}
              </div>
            </div>
            
            <input 
              type="range"
              min="0"
              max="4"
              value={timeMachineMode}
              onChange={(e) => setTimeMachineMode(parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-grab active:cursor-grabbing"
              style={{ direction: 'ltr' }}
            />
            
            <div className="flex justify-between w-full text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 px-1" style={{ direction: 'ltr' }}>
              <span className={timeMachineMode === 0 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>Now</span>
              <span className={timeMachineMode === 1 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-1M</span>
              <span className={timeMachineMode === 2 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-3M</span>
              <span className={timeMachineMode === 3 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-6M</span>
              <span className={timeMachineMode === 4 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-1Y</span>
            </div>
          </div>
        </div>`;

const newBottomDateFilter = `{/* The New Sleek Unified Time Filter */}
        <div className="fixed bottom-2 md:bottom-2 left-0 right-0 md:left-auto md:right-1/2 md:translate-x-1/2 z-[90] p-4 flex justify-center pointer-events-none fade-in animate-in slide-in-from-bottom-5 duration-700 delay-500">
          <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[1.5rem] p-1.5 flex items-center justify-between shadow-[0_15px_40px_-5px_rgba(0,0,0,0.4)] pointer-events-auto border border-white/10 w-full sm:w-[450px]">
             {[
               { id: "day", label: "يوم" },
               { id: "week", label: "أسبوع" },
               { id: "month", label: "شهر" },
               { id: "year", label: "سنة" },
               { id: "all", label: "الكل" }
             ].map((opt) => (
                <button 
                  key={opt.id}
                  onClick={() => startTransition(() => setDateFilter(opt.id as any))}
                  className={cn(
                    "relative flex-1 py-2 md:py-2 rounded-[1.2rem] text-[11px] md:text-sm font-bold font-mono transition-all duration-300 outline-none select-none",
                    dateFilter === opt.id 
                      ? "text-slate-900 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" 
                      : "text-slate-400 hover:text-white hover:bg-white/5 active:scale-95"
                  )}
                >
                  {opt.label}
                  {dateFilter === opt.id && (
                    <motion.div
                      layoutId="activeFilterBg"
                      className="absolute inset-0 bg-amber-400 rounded-[1.2rem] -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>
             ))}
          </div>
        </div>`;

if (!content.includes(oldBottomTimeMachineStr)) {
  console.log("Could not find the Exact Time Machine string. Trying regex...");
  let tmRegex = /\{\/\*\s*آلة الزمن المالي.*?<\/div>\s*<\/div>/s;
  if(tmRegex.test(content)) {
     content = content.replace(tmRegex, newBottomDateFilter);
     console.log("Replaced via regex!");
  } else {
     console.log("Regex also missed it.");
  }
} else {
  content = content.replace(oldBottomTimeMachineStr, newBottomDateFilter);
  console.log("Replaced Time Machine exact match.");
}

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Dashboard updated.");
