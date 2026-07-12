import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/App.tsx', 'utf8');

// Header
content = content.replace(/className="h-12 md:h-20 bg-white\/70 backdrop-blur-3xl border-b border-slate-200\/50/g, 'className="h-12 md:h-20 glass-surface');
content = content.replace(/bg-white\/70 backdrop-blur-3xl/g, 'glass-surface');

// Sidebar Desktop
content = content.replace(/className="hidden md:flex w-24 lg:w-72 flex-col bg-white border-l border-slate-200\/50 shadow-2xl relative z-40 transition-all duration-300 shrink-0"/g, 'className="hidden md:flex w-24 lg:w-72 flex-col glass-surface relative z-40 transition-all duration-300 shrink-0 border-l border-white/20 shadow-xl"');

// Sidebar Mobile
content = content.replace(/className="w-72 h-full bg-white shadow-2xl flex flex-col"/g, 'className="w-72 h-full glass-surface shadow-2xl flex flex-col"');

writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx layout classes");
