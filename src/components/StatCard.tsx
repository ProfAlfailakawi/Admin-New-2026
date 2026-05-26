import React from 'react';
import { cn } from '../lib/utils';
import { SpatialGlassCard } from './ui/SpatialGlassCard';

interface StatCardProps {
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  description?: string;
}

export const StatCardComponent: React.FC<StatCardProps> = ({ label, value, icon, color, description }) => {
  const textColorMap: Record<string, string> = {
    blue: 'text-blue-600 border-blue-100',
    emerald: 'text-emerald-600 border-emerald-100',
    amber: 'text-amber-600 border-amber-100',
    red: 'text-red-600 border-red-100',
    accent: 'text-indigo-600 border-indigo-100'
  };

  const glowColorMap: Record<string, string> = {
    blue: 'rgba(59, 130, 246, 0.16)',
    emerald: 'rgba(16, 185, 129, 0.20)',
    amber: 'rgba(245, 158, 11, 0.16)',
    red: 'rgba(239, 68, 68, 0.16)',
    accent: 'rgba(99, 102, 241, 0.16)'
  };

  return (
    <SpatialGlassCard 
      glowColor={glowColorMap[color] || glowColorMap.blue} 
      className="p-3.5 md:p-5 text-right w-full flex md:block items-center justify-between gap-2 border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.03)] rounded-2xl md:rounded-[24px]"
    >
      <div className="flex md:block items-center gap-2 md:mb-2 w-full md:justify-start flex-row-reverse md:flex-row justify-between">
        <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/90 border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shrink-0 [&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-5 md:[&>svg]:h-5", textColorMap[color] || textColorMap.blue)}>
          {icon}
        </div>
        <div className="hidden md:block text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 leading-tight">
          {label}
        </div>
      </div>
      <div className="flex flex-col text-left md:text-right">
        <div className="md:hidden text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
        <div className="text-sm md:text-2xl font-mono tracking-tighter font-bold text-slate-800 mb-0.5 md:mb-1">{value}</div>
        {description && <div className="hidden md:block text-[9px] md:text-[10px] font-bold text-slate-400 leading-tight">{description}</div>}
      </div>
    </SpatialGlassCard>
  );
};
