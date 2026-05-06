const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacement = `    {/* TABS & FILTER - Horizontal on Desktop */}
    <div className="flex flex-col lg:flex-row items-center gap-4 w-full justify-between mt-4">
      
      {/* 2) TABS - Full Width Mobile, Flex-1 Desktop */}
      <div className="flex gap-2 w-full lg:w-auto overflow-x-auto scrollbar-hide py-1 flex-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[14px] font-black transition-all duration-300 outline-none whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-xl scale-100 relative z-10" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            )}
          >
            {React.cloneElement(tab.icon, { 
              size: 18, 
              className: cn("transition-transform duration-500 group-hover:scale-110 relative z-10", activeTab === tab.id ? "text-amber-400" : "text-slate-400") 
            })}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3) FILTER - Full Width Mobile, Auto Desktop */}
      <div className="flex gap-2 w-full lg:w-auto overflow-x-auto scrollbar-hide py-1 shrink-0">
        {['day','week','month','year','all'].map((tf) => (
          <button 
            key={tf}
            onClick={() => startTransition(() => setDateFilter(tf))}
            className={cn(
              "flex-1 lg:flex-none min-w-max flex items-center justify-center px-4 py-3.5 rounded-2xl text-[12px] uppercase font-black transition-all duration-300 outline-none whitespace-nowrap border border-slate-200", 
              dateFilter === tf 
                ? "border-slate-800 text-slate-900 bg-white shadow-sm ring-1 ring-slate-800" 
                : "border-transparent text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {tf === 'day' ? 'يوم' : tf === 'week' ? 'أسبوع' : tf === 'month' ? 'شهر' : tf === 'year' ? 'سنة' : 'الكل'}
          </button>
        ))}
      </div>
    </div>`;

const tabStart = content.indexOf('{/* 2) TABS - Full Width */}');
const contentAfterTabs = content.substring(tabStart);
// filter map ends at `</button>\n      ))}</div>` -> find indexOf that.
const endOfFilterMap = contentAfterTabs.indexOf('الكل\'}\n        </button>\n      ))}\n    </div>');

if (tabStart !== -1 && endOfFilterMap !== -1) {
    const endStr = 'الكل\'}\n        </button>\n      ))}\n    </div>';
    const endIndex = tabStart + endOfFilterMap + endStr.length;
    const toReplace = content.substring(tabStart, endIndex);
    content = content.replace(toReplace, replacement);
    fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
}
