import fs from 'fs';

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  "    await logout();",
  "    sessionStorage.removeItem('hideSampleDataPrompt');\n    await logout();"
);

fs.writeFileSync('src/App.tsx', appContent);

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

content = content.replace(
  /className="mb-4 bg-indigo-50\/80 border border-indigo-100 rounded-2xl p-3 flex flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-500 text-right w-full overflow-hidden relative shadow-sm"/g,
  'className="mb-4 bg-indigo-50/80 border border-indigo-100 rounded-xl p-2.5 flex flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-500 text-right w-full overflow-hidden relative shadow-sm"'
);

content = content.replace(
  /<div className="bg-indigo-500 text-white p-2 rounded-xl shrink-0">/g,
  '<div className="bg-indigo-500 text-white p-1.5 rounded-lg shrink-0">'
);

content = content.replace(
  /<Database size={18} \/>/g,
  '<Database size={16} />'
);

content = content.replace(
  /<h3 className="text-sm font-black text-slate-900 leading-tight mb-0.5">النظام فارغ حالياً<\/h3>/g,
  '<h3 className="text-xs font-black text-slate-900 leading-tight mb-0.5">النظام فارغ حالياً</h3>'
);

content = content.replace(
  /<p className="text-slate-600 font-bold text-xs leading-relaxed">/g,
  '<p className="text-slate-600 font-bold text-[10px] leading-relaxed">'
);

content = content.replace(
  /className="bg-indigo-600 outline-none text-white font-black text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 hover:scale-\[1.02\] active:scale-95"/g,
  'className="bg-indigo-600 outline-none text-white font-black text-[11px] px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95"'
);

content = content.replace(
  /<Download size={14} \/>/g,
  '<Download size={12} />'
);

content = content.replace(
  /className="bg-white text-slate-500 outline-none border border-slate-200 hover:text-slate-700 hover:bg-slate-50 p-2 rounded-lg transition-all flex items-center justify-center hover:scale-\[1.02\] active:scale-95 shrink-0"/g,
  'className="bg-white text-slate-500 outline-none border border-slate-200 hover:text-slate-700 hover:bg-slate-50 p-1.5 rounded-md transition-all flex items-center justify-center hover:scale-[1.02] active:scale-95 shrink-0"'
);

content = content.replace(
  /<X size={14} \/>/g,
  '<X size={12} />'
);

fs.writeFileSync('src/components/Dashboard.tsx', content);

console.log("Patch applied.");
