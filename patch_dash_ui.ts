import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

const timeMachineUI = `
        {/* آلة الزمن المالي (Financial Time Machine) */}
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
        </div>
`;

content = content.replace('      </div>\n    );\n  },\n);', timeMachineUI + '\n      </div>\n    );\n  },\n);');

writeFileSync('src/components/Dashboard.tsx', content);
console.log("Attached Time Machine UI");
