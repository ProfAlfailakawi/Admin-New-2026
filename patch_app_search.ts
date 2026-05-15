import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] md:hidden"',
  'className={`fixed transition-all duration-700 ease-in-out left-1/2 -translate-x-1/2 z-[100] md:hidden ${activeTab === "dashboard" ? "bottom-24" : "bottom-8"}`}'
);

content = content.replace(
  'className="hidden md:flex items-center gap-2 sm:gap-4 bg-slate-50/80 hover:bg-white p-3 sm:px-5 sm:py-3 rounded-[1rem] sm:rounded-2xl border border-slate-200/60/50 transition-all group overflow-hidden shadow-sm hover:shadow-md hover:border-amber-400"',
  'className="hidden md:flex items-center gap-2 sm:gap-4 glass-surface hover:bg-white p-3 sm:px-5 sm:py-3 rounded-[1rem] sm:rounded-2xl transition-all group overflow-hidden hover:shadow-md hover:border-amber-400"'
);

writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx search styles");
