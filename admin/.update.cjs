const fs = require('fs');

const path = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const patternToReplace = /\{\/\* Main Dashboard Header & Navigation \*\/\}([\s\S]*?)<div className=\{cn\("px-2 transition-opacity duration-300", isPending \?"opacity-50" :"opacity-100"\)\}>/g;

const replacement = `{/* Main Dashboard Header & Navigation */}
  <div className="flex flex-col gap-6 w-full relative z-40 mb-8 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 lg:px-8 py-6 pb-8" dir="rtl">
    
    {/* 1) HEADER - Full Width Title */}
    <div className="flex items-center gap-4 w-full">
      <div 
        onClick={() => setActiveTab('pulse')}
        className="flex shrink-0 items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl transition-all cursor-pointer"
      >
        <Sparkles size={28} className="text-amber-400 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl md:text-3xl font-black text-slate-900 leading-tight">
          {greeting.title}
        </h1>
        <p className="text-slate-500 text-sm font-black flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          {greeting.sub}
        </p>
      </div>
    </div>

    {/* 2) TABS - Full Width */}
    <div className="flex gap-2 w-full overflow-x-auto scrollbar-hide py-1">
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

    {/* 3) FILTER - Full Width */}
    <div className="flex gap-2 w-full overflow-x-auto scrollbar-hide py-1">
      {['day','week','month','year','all'].map((tf) => (
        <button 
          key={tf}
          onClick={() => startTransition(() => setDateFilter(tf))}
          className={cn(
            "flex-1 min-w-max flex items-center justify-center px-4 py-3 rounded-2xl text-[12px] uppercase font-black transition-all duration-300 outline-none whitespace-nowrap border-2", 
            dateFilter === tf 
              ? "border-slate-800 text-slate-900 bg-white shadow-sm" 
              : "border-transparent text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
          )}
        >
          {tf === 'day' ? 'يوم' : tf === 'week' ? 'أسبوع' : tf === 'month' ? 'شهر' : tf === 'year' ? 'سنة' : 'الكل'}
        </button>
      ))}
    </div>

  </div>

  {/* 4) CONTENT - Full Width */}
  <div className={cn("px-4 lg:px-8 w-full flex flex-col transition-opacity duration-300", isPending ?"opacity-50" :"opacity-100")}>
`;

content = content.replace(patternToReplace, replacement);
fs.writeFileSync(path, content, 'utf8');
