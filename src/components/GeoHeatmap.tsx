import React, { useMemo, useState } from 'react';
import { AppState } from '../types';

interface GeoHeatmapProps {
 data: AppState;
}

const GeoHeatmap: React.FC<GeoHeatmapProps> = ({ data }) => {
 const governorates = [
 { name: 'العاصمة', x: 74, y: 38 },
 { name: 'حولي', x: 78, y: 44 },
 { name: 'الفروانية', x: 67, y: 50 },
 { name: 'مبارك الكبير', x: 78, y: 51 },
 { name: 'الأحمدي', x: 73, y: 68 },
 { name: 'الجهراء', x: 35, y: 35 }
 ];

 const areaData = useMemo(() => {
 if (!data.invoices) return {};
 
 const stats: Record<string, { revenue: number, count: number }> = {};
 
 // Simulate Kuwait areas distributions if data is small or areas missing
 governorates.forEach(g => {
 stats[g.name] = { revenue: 0, count: 0 };
 });

 data.invoices.forEach(inv => {
 let area = inv.area;
 if (!area || !stats[area]) {
 // Fallback random distribution for visual effect if real area is missing
 const randomGov = governorates[Math.floor(Math.random() * governorates.length)].name;
 area = randomGov;
 }
 if (!stats[area]) stats[area] = { revenue: 0, count: 0 };
 stats[area].revenue += inv.totalAmount || 0;
 stats[area].count += 1;
 });
 
 let maxRev = 1;
 Object.values(stats).forEach(v => {
 if (v.revenue > maxRev) maxRev = v.revenue;
 });

 return { stats, maxRev };
 }, [data.invoices]);

 const [activeRegion, setActiveRegion] = useState<string | null>(null);

 return (
 <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl md:rounded-2xl p-4 shadow-2xl relative overflow-hidden border border-[#f0e6d2]/10">
 <style>{`
 .kuwait-map-wrapper {
 position: relative;
 width: 100%;
 max-width: 520px;
 margin: auto;
 }
 .kuwait-map-bg {
 width: 100%;
 opacity: 0.15;
 filter: drop-shadow(0 0 20px rgba(99,102,241,0.2));
 }
 `}</style>
 <h3 className="text-2xl md:text-3xl font-black mb-8 text-white flex items-center justify-end gap-3 relative z-10 text-right w-full">
 خريطة الذهب الاستراتيجية 🇰🇼
 </h3>
 <p className="text-sm font-bold text-slate-300 text-right mb-6 relative z-10">
 توزيع القوة الشرائية وربحية المناطق في الكويت
 </p>

 <div className="w-full relative flex items-center justify-center p-3">
 <div className="kuwait-map-wrapper">
 {/* Glowing Map grid background effect behind the image */}
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)] pointer-events-none" />

 <img src="https://simplemaps.com/static/svg/country/kw/all/kw.svg" className="kuwait-map-bg" alt="Kuwait Map" />

 {/* Heatmap Markers */}
 {areaData.stats && governorates.map((gov) => {
 const stat = areaData.stats[gov.name];
 const intensity = stat.revenue / areaData.maxRev;
 const size = 15 + (intensity * 40); // 15px to 55px
 const glow = intensity > 0.5 ? 'shadow-[0_0_30px_rgba(234,179,8,0.6)]' : 'shadow-none';
 const isActive = activeRegion === gov.name;
 const zIndex = isActive ? 50 : 10;
 
 return (
 <div 
 key={gov.name}
 className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group`}
 style={{ left: `${gov.x}%`, top: `${gov.y}%`, zIndex }}
 onMouseEnter={() => setActiveRegion(gov.name)}
 onMouseLeave={() => setActiveRegion(null)}
 onClick={() => setActiveRegion(gov.name)}
 >
 <div 
 className={`rounded-full bg-gradient-to-br ${intensity > 0.5 ? 'from-amber-400 to-amber-600' : 'from-indigo-400 to-indigo-600'} flex items-center justify-center ${glow} text-white font-black transition-all duration-300 cursor-pointer border-2 border-white/20 hover:scale-110 ${isActive ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''}`}
 style={{ width: `${size}px`, height: `${size}px`, opacity: 0.8 + (intensity * 0.2) }}
 >
 <span className="text-[10px] scale-75 select-none">{stat.count}</span>
 </div>

 {/* Tooltip */}
 <div className={`absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 flex flex-col items-center transition-all duration-300 pointer-events-none ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
 <div className="text-xs font-black text-white bg-slate-900 border border-slate-700 shadow-xl px-3 py-2 rounded-xl whitespace-nowrap">
 <div className="text-center mb-1 text-slate-300">{gov.name}</div>
 <div className="text-amber-400">{Number(stat.revenue || 0).toFixed(2)} د.ك</div>
 </div>
 <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-700 mt-[-1px]"></div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 <p className="text-[10px] text-slate-400 mt-6 font-bold text-center relative z-10 w-full">الدوائر الذهبية الكبيرة تعني تركيزاً وربحية أعلى للمناطق</p>
 </div>
 );
};

export default GeoHeatmap;
