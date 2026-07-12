import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/Dashboard.tsx', 'utf8');

// The main total numbers
// text-4xl md:text-5xl font-bold text-slate-900 tracking-tight
content = content.replace(/text-4xl md:text-5xl font-bold/g, 'text-4xl md:text-5xl font-mono font-bold tracking-tighter');
content = content.replace(/text-3xl md:text-5xl font-bold/g, 'text-3xl md:text-5xl font-mono font-bold tracking-tighter');

// Other big numbers
content = content.replace(/text-2xl min-\[360px\]:text-3xl sm:text-4xl lg:text-5xl/g, 'text-2xl min-[360px]:text-3xl sm:text-4xl lg:text-5xl font-mono tracking-tighter');
content = content.replace(/text-lg min-\[360px\]:text-xl sm:text-3xl/g, 'text-lg min-[360px]:text-xl sm:text-3xl font-mono tracking-tighter');

// Interactive hover to Dashboard cards
content = content.replace(/hover:-translate-y-1 transition-all/g, 'interactive-hover');
content = content.replace(/hover:shadow-2xl transition-all duration-500/g, 'interactive-hover');
content = content.replace(/hover:shadow-xl transition-all duration-300/g, 'interactive-hover');
content = content.replace(/group-hover:scale-105 transition-transform/g, 'interactive-hover');


writeFileSync('src/components/Dashboard.tsx', content);
console.log("Updated Dashboard typography and hover");
