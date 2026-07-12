import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/components/GeoHeatmap.tsx', 'utf8');

// The new visual structure for GeoHeatmap. It should look like an abstract pattern map, with glowing dots that pulse.
// Rather than fully rewriting, I'll inject styling and text changes.

content = content.replace(/التوزيع الجغرافي للطلبات/g, 'خريطة نبض التراث');
content = content.replace(/bg-slate-50/g, 'bg-slate-900 overflow-hidden relative');

let cssInjection = `
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '30px 30px' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-0"></div>
`;

if(content.includes('className="relative w-full h-[400px]"')) {
    content = content.replace(/className="relative w-full h-\[400px\]"/g, 'className="relative w-full h-[400px]"' + '\\n' + cssInjection.replace(/\\n/g, ''));
}

content = content.replace(/bg-rose-500/g, 'bg-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] shadow-amber-500/50 mix-blend-screen');
content = content.replace(/text-slate-800/g, 'text-amber-50 drop-shadow-md');
content = content.replace(/shadow-xl/g, 'shadow-2xl shadow-indigo-900/50 border border-white/10 glass-dark text-white');
content = content.replace(/bg-white/g, 'bg-slate-800/90');

writeFileSync('src/components/GeoHeatmap.tsx', content);
console.log("Updated GeoHeatmap");

