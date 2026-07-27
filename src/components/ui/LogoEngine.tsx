import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogoEngineProps {
 src?: string;
 className?: string;
 size?: 'sm' | 'md' | 'lg' | 'xl';
 variant?: 'glass' | 'minimal' | 'royal';
}

const LogoEngine: React.FC<LogoEngineProps> = ({ 
 src, 
 className, 
 size = 'md',
 variant = 'royal'
}) => {
 const sizeClasses = {
 sm: 'w-8 h-8 rounded-lg',
 md: 'w-12 h-12 rounded-2xl',
 lg: 'w-12 h-12 md:w-16 md:h-16 rounded-[24px]',
 xl: 'w-24 h-24 rounded-3xl'
 };

 const logoSizeClasses = {
 sm: 'w-[65%] h-[65%]',
 md: 'w-[65%] h-[65%]',
 lg: 'w-[65%] h-[65%]',
 xl: 'w-[65%] h-[65%]'
 };

 return (
 <motion.div 
 whileHover={{ scale: 1.05, y: -2 }}
 whileTap={{ scale: 0.95 }}
 className={cn(
"relative flex items-center justify-center shrink-0 group transition-all duration-500 bg-transparent overflow-hidden",
 sizeClasses[size],
 className
)}
 >
 {/* 1. Backdrop / Atmosphere */}
 {variant === 'royal' && (
 <>
 {/* Edge Light Reflection */}
 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-black/5 pointer-events-none" />
 </>
)}

 {/* 2. Logo Container with Protection Layer */}
 <div className={cn(
"relative z-10 flex items-center justify-center w-[75%] h-[75%]"
)}>
 {src ? (
 <div className="relative w-full h-full flex items-center justify-center">
 <img 
 src={src} 
 className="max-w-full max-h-full object-contain app-icon-logo"
 referrerPolicy="no-referrer" 
 alt="Brand Logo"
 />
 </div>
) : (
 <div className="relative">
 <ShoppingCart className="text-white/80" size={size === 'sm' ? 16 : 24} />
 <motion.div
 animate={{ opacity: [0.4, 1, 0.4] }}
 transition={{ repeat: Infinity, duration: 2 }}
 className="absolute -top-1 -right-1"
 >
 <Sparkles size={10} className="text-accent" />
 </motion.div>
 </div>
)}
 </div>

 {/* 3. Interactive Corner Specular Highlights */}
 <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/20 blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
 </motion.div>
);
};

export default LogoEngine;
