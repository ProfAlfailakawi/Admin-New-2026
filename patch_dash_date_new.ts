import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const oldFilterRegex = /\{\/\*\s*The New Sleek Unified Time Filter\s*\*\/\}[\s\S]*?<\/div>\s*<\/div>/;

const newUI = `{/* آلة الزمن المالي (Financial Time Machine) */}
        <div className="fixed bottom-0 md:bottom-2 left-0 right-0 md:left-auto md:right-1/2 md:translate-x-1/2 z-[90] p-4 flex justify-center pointer-events-none fade-in animate-in slide-in-from-bottom-10 duration-700 delay-1000">
          <div className="glass-dark rounded-[2rem] p-4 flex flex-col items-center gap-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] pointer-events-auto w-full md:w-[700px] border border-white/10">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2 text-white shrink-0">
                <History className="opacity-70 text-amber-400 animate-spin-slow" size={16} />
                <span className="font-bold text-[10px] md:text-sm uppercase tracking-[0.2em] text-amber-500 font-mono">الزمن المالي</span>
              </div>
              
              <div className="text-[10px] md:text-xs font-bold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {dateFilter === 'day' ? 'الوقت الفعلي (اليوم)' : \`العودة للوراء: \${dateFilter === 'week' ? 'أسبوع' : dateFilter === 'month' ? 'شهر' : dateFilter === 'year' ? 'سنة' : 'كل الأوقات'}\`}
              </div>
            </div>
            
            <input 
              type="range"
              min="0"
              max="4"
              value={["all", "year", "month", "week", "day"].indexOf(dateFilter)}
              onChange={(e) => {
                const map = ["all", "year", "month", "week", "day"];
                startTransition(() => setDateFilter(map[parseInt(e.target.value)] as any));
              }}
              className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-grab active:cursor-grabbing"
              style={{ direction: 'ltr' }}
            />
            
            <div className="flex justify-between w-full text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 px-1" style={{ direction: 'ltr' }}>
              <span className={dateFilter === "all" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>All</span>
              <span className={dateFilter === "year" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-1Y</span>
              <span className={dateFilter === "month" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-1M</span>
              <span className={dateFilter === "week" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>-1W</span>
              <span className={dateFilter === "day" ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""}>Now</span>
            </div>
          </div>
        </div>`;

content = content.replace(oldFilterRegex, newUI);

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated to visual Time Machine styling.");
