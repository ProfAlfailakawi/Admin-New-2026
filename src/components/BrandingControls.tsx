import React from 'react';
import { cn } from '../lib/utils';
import { Layout } from 'lucide-react';

interface BrandingControlsProps {
  useBranding: boolean;
  setUseBranding: (v: boolean) => void;
  brandingStyle: string;
  setBrandingStyle: (v: any) => void;
  logoPosition: string;
  setLogoPosition: (v: any) => void;
  logoOpacity?: number;
  setLogoOpacity?: (v: number) => void;
  colorClass?: 'indigo' | 'rose' | 'purple';
  title?: string;
  isCompact?: boolean;
}

export const BrandingControls: React.FC<BrandingControlsProps> = ({
  useBranding, setUseBranding, brandingStyle, setBrandingStyle, logoPosition, setLogoPosition, logoOpacity, setLogoOpacity, colorClass = 'indigo', title = 'إضافة الهوية', isCompact = false
}) => {
  const bgMap: any = { indigo: 'bg-indigo-600', rose: 'bg-rose-600', purple: 'bg-purple-600' };
  const textMap: any = { indigo: 'text-indigo-700', rose: 'text-rose-700', purple: 'text-purple-700' };
  const textTitleMap: any = { indigo: 'text-indigo-600', rose: 'text-rose-600', purple: 'text-purple-600' };
  const borderMap: any = { indigo: 'border-indigo-500', rose: 'border-rose-500', purple: 'border-purple-500' };
  const bgSoftMap: any = { indigo: 'bg-indigo-50', rose: 'bg-rose-50', purple: 'bg-purple-50' };

  return (
    <div className={cn("w-full shrink-0", !isCompact && "space-y-4")}>
      <div className="flex justify-between items-center gap-2">
        {isCompact ? (
          <span className="text-xs font-bold text-slate-500">{title}</span>
        ) : (
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
             <Layout size={16} className={textTitleMap[colorClass] || ''} />
             {title}
          </h3>
        )}
        <button 
          onClick={() => setUseBranding(!useBranding)}
          style={{ direction: 'ltr' }}
          className={cn("w-12 h-6 rounded-full transition-all flex items-center px-1 shrink-0", useBranding ? (bgMap[colorClass] || 'bg-indigo-600') : "bg-slate-200", useBranding ? "justify-end" : "justify-start")}
        >
          <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
        </button>
      </div>

      {useBranding && (
        <div className={cn("space-y-4 animate-in slide-in-from-top-2 duration-300", isCompact ? "mt-3 pt-3 border-t border-slate-100/50" : "")}>
          <div className="p-1.5 bg-slate-100 rounded-xl flex gap-1 flex-wrap">
             <button onClick={() => setBrandingStyle('smooth')} className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all min-w-[45px]", brandingStyle === 'smooth' ? `bg-white shadow-sm ${textMap[colorClass]}` : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>ظل ناعم</button>
             <button onClick={() => setBrandingStyle('elegant')} className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all min-w-[45px]", brandingStyle === 'elegant' ? `bg-white shadow-sm ${textMap[colorClass]}` : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>إطار أنيق</button>
             <button onClick={() => setBrandingStyle('polaroid')} className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all min-w-[45px]", brandingStyle === 'polaroid' ? `bg-white shadow-sm ${textMap[colorClass]}` : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>مطبوعة</button>
             <button onClick={() => setBrandingStyle('heritage')} className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all min-w-[45px]", brandingStyle === 'heritage' ? `bg-white shadow-sm ${textMap[colorClass]}` : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>تراثي</button>
             <button onClick={() => setBrandingStyle('classic')} className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all min-w-[45px]", brandingStyle === 'classic' ? `bg-white shadow-sm ${textMap[colorClass]}` : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700')}>لوجو فقط</button>
          </div>
          
          <div className="pt-1">
            <label className="text-[10px] font-bold text-slate-500 mb-2 block text-right">موقع اللوجو</label>
            <div className="grid grid-cols-4 gap-2">
               <button onClick={() => setLogoPosition('top-right')} className={cn("py-2 rounded-lg border text-[10px] font-bold transition-all", logoPosition === 'top-right' ? `${borderMap[colorClass]} ${bgSoftMap[colorClass]} ${textMap[colorClass]}` : "border-slate-200 hover:bg-slate-50 text-slate-600")}>أعلى يمين</button>
               <button onClick={() => setLogoPosition('top-left')} className={cn("py-2 rounded-lg border text-[10px] font-bold transition-all", logoPosition === 'top-left' ? `${borderMap[colorClass]} ${bgSoftMap[colorClass]} ${textMap[colorClass]}` : "border-slate-200 hover:bg-slate-50 text-slate-600")}>أعلى يسار</button>
               <button onClick={() => setLogoPosition('bottom-right')} className={cn("py-2 rounded-lg border text-[10px] font-bold transition-all", logoPosition === 'bottom-right' ? `${borderMap[colorClass]} ${bgSoftMap[colorClass]} ${textMap[colorClass]}` : "border-slate-200 hover:bg-slate-50 text-slate-600")}>أسفل يمين</button>
               <button onClick={() => setLogoPosition('bottom-left')} className={cn("py-2 rounded-lg border text-[10px] font-bold transition-all", logoPosition === 'bottom-left' ? `${borderMap[colorClass]} ${bgSoftMap[colorClass]} ${textMap[colorClass]}` : "border-slate-200 hover:bg-slate-50 text-slate-600")}>أسفل يسار</button>
            </div>
          </div>
          
          {setLogoOpacity && logoOpacity !== undefined && (
            <div className="space-y-2 mt-4 px-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                <span>الشفافية</span>
                <span>{Math.round(logoOpacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                value={logoOpacity}
                onChange={(e) => setLogoOpacity(parseFloat(e.target.value))}
                className={cn("w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer", `accent-${colorClass}-600`)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
