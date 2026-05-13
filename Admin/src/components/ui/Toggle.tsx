import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface ToggleProps {
 checked: boolean;
 onChange: (checked: boolean) => void;
 className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, className }) => {
 return (
 <button
 type="button"
 onClick={() => onChange(!checked)}
 className={cn(
"relative flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-300 focus:outline-none",
 checked ?"bg-emerald-500 justify-end" :"bg-slate-300 justify-start",
 className
)}
 >
 <motion.span
 layout
 className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
 transition={{ type:"spring", stiffness: 500, damping: 30 }}
 />
 </button>
);
};
