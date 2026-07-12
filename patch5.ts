import fs from 'fs';

let content = fs.readFileSync('src/components/GeneralSettings.tsx', 'utf-8');

content = content.replace(
  "localStorage.removeItem('ktk_accounting_data');",
  "localStorage.removeItem('ktk_accounting_data');\n  localStorage.removeItem('hideSampleDataPrompt');"
);

content = content.replace(
  "const demo = GET_DEMO_DATA();\n  setData(demo);\n  addToast(\"تم تحميل البيانات\",\"تم ملء النظام ببيانات تجريبية شاملة للمعاينة.\",\"info\");",
  "const demo = GET_DEMO_DATA();\n  setData(demo);\n  localStorage.setItem('hideSampleDataPrompt', 'true');\n  addToast(\"تم تحميل البيانات\",\"تم ملء النظام ببيانات تجريبية شاملة للمعاينة.\",\"info\");"
);

content = content.replace(
  "<button \n  onClick={handleLoadDemo}\n  disabled={appMode === 'cloud'}\n  className={cn(\n \"w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm\",\n  appMode === 'cloud' \n  ?\"bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60\"\n  :\"bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]\"\n )}\n  >\n  <Sparkles size={18} className={appMode === 'cloud' ?\"\" :\"group-hover:rotate-12 transition-transform\"} />\n  <div className=\"text-right\">\n  <div className=\"text-xs font-black\">تحميل بيانات تجريبية (Demo)</div>\n  <div className=\"text-[9px] opacity-80\">{appMode === 'cloud' ?\"غير متاح في وضع التزامن السحابي\" :\"لمعاينة النظام ببيانات واقعية جاهزة\"}</div>\n  </div>\n  </button>",
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

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace(
  "// 1. Clear Local Storage\n        localStorage.removeItem('ktk_accounting_data');\n        \n        // 2. Clear Cloud Dev Data",
  "// 1. (REMOVED: do not clear local storage on logout to preserve demo data)\n        // localStorage.removeItem('ktk_accounting_data');\n        \n        // 2. Clear Cloud Dev Data"
);

fs.writeFileSync('src/App.tsx', appContent);

console.log("Patch applied.");
