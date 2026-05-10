import fs from 'fs';

let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf-8');

content = content.replace(
  /<button\s+onClick={handleLoadDemo}[\s\S]*?<\/button>/,
  `{(() => {
    const hasData = (data.invoices && data.invoices.length > 0) || (data.products && data.products.length > 0);
    const isDisabled = appMode === 'cloud' || hasData;
    
    return (
      <button 
        onClick={handleLoadDemo}
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm",
          appMode === 'cloud' 
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : hasData
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]"
        )}
      >
        <Sparkles size={18} className={appMode === 'cloud' || hasData ? "" : "group-hover:rotate-12 transition-transform"} />
        <div className="text-right">
          <div className="text-xs font-black">تحميل بيانات تجريبية (Demo)</div>
          <div className="text-[9px] opacity-80">
            {appMode === 'cloud' 
              ? "غير متاح في وضع التزامن السحابي" 
              : hasData 
              ? "النظام يحتوي على بيانات مسبقاً" 
              : "لمعاينة النظام ببيانات واقعية جاهزة"}
          </div>
        </div>
      </button>
    );
  })()}`
);

fs.writeFileSync('src/components/GeneralSettings.tsx', content);

console.log("Patch 6 applied.");
