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
  };

  return (
    <div className={cn("p-4 rounded-2xl border text-right group", colorMap[color])}>
      <div className="flex justify-between items-center mb-2 flex-row-reverse">
        <div className="w-10 h-10 rounded-xl bg-white border border-inherit flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="text-[10px] font-black uppercase opacity-60">{label}</div>
      </div>
      <div>
        <div className="text-xl md:text-2xl font-black tracking-tighter mb-0.5">{value}</div>
        {description && <div className="text-[10px] font-bold opacity-40">{description}</div>}
      </div>
    </div>
  );
};
