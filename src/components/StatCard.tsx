import React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
  description?: string;
}

export const StatCardComponent: React.FC<StatCardProps> = ({ label, value, icon, color, description }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    accent: 'bg-accent/10 text-accent-dark border-accent/20'
  };

  return (
    <div className={cn("p-2.5 md:p-4 rounded-[14px] md:rounded-2xl border text-right group flex md:block items-center justify-between gap-2", colorMap[color] || colorMap.blue)}>
      <div className="flex md:block items-center gap-2 md:mb-2">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white border border-inherit flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0 [&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-5 md:[&>svg]:h-5">
          {icon}
        </div>
        <div className="hidden md:block text-[10px] font-black uppercase opacity-60 leading-tight">
          {label}
        </div>
      </div>
      <div className="flex flex-col text-left md:text-right">
        <div className="md:hidden text-[9px] font-black uppercase opacity-60 leading-tight mb-0.5">{label}</div>
        <div className="text-sm md:text-2xl font-black tracking-tighter mb-0.5 md:mb-1">{value}</div>
        {description && <div className="hidden md:block text-[10px] font-bold opacity-40 leading-tight">{description}</div>}
      </div>
    </div>
  );
};
