import React from 'react';
import { motion } from 'motion/react';
import { Coffee, CloudRain, Wind } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const quotes = [
  "الهدوء يسبق العاصفة.. ناطرين أول زبون ☕",
  "الميدان يا حميدان.. خلنا نبدأ بشي جديد اليوم",
  "القهوة زاهبة، بس ناقصنا أوردراتكم!",
  "صفحة بيضا.. ناطرة إبداعكم اليوم"
];

const SmartEmptyState: React.FC<Props> = ({ 
    icon = <Coffee className="w-12 h-12 text-slate-300" />, 
    title, 
    subtitle = "لا توجد بيانات حالياً في هذا القسم", 
    actionLabel, 
    onAction,
    className
}) => {
  const finalTitle = title || quotes[Math.floor(Math.random() * quotes.length)];
  return (
    <motion.div 
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       className={cn("flex flex-col items-center justify-center p-8 md:p-16 text-center h-full min-h-[300px]", className)}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-white w-24 h-24 rounded-full shadow-sm flex items-center justify-center border border-slate-50">
           {icon}
        </div>
      </div>
      
      <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2 leading-relaxed">
        {finalTitle}
      </h3>
      
      <p className="text-slate-500 font-bold mb-8 max-w-sm">
        {subtitle}
      </p>

      {actionLabel && onAction && (
          <button 
             onClick={onAction}
             className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20 animate-pulse-slow relative overflow-hidden group"
          >
             <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
             <span className="relative z-10">{actionLabel}</span>
          </button>
      )}
    </motion.div>
  );
};

export default SmartEmptyState;