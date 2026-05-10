import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from '../types';
import { Activity, Waves } from 'lucide-react';

interface Props {
  data: AppState;
}

const SystemPulseOrb: React.FC<Props> = ({ data }) => {
  const pendingOrders = (data.orders || []).filter(o => o.status === 'pending' || o.status === 'failed').length;
  const pendingInvoices = (data.invoices || []).filter(i => i.paymentStatus === 'pending' && !i.isDeleted).length;
  const pendingCount = pendingOrders + pendingInvoices;
  const isBusy = pendingCount > 0;
  
  const [showTooltip, setShowTooltip] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showTooltip) {
      if (orbRef.current) {
        const rect = orbRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 10, left: rect.left + rect.width / 2 });
      }
      const t = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showTooltip]);

  const handleClick = () => {
    setShowTooltip(!showTooltip);
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
           const ctx = new AudioContext();
           const osc = ctx.createOscillator();
           const gain = ctx.createGain();
           osc.connect(gain);
           gain.connect(ctx.destination);
           osc.type = 'sine';
           osc.frequency.setValueAtTime(isBusy ? 800 : 400, ctx.currentTime);
           osc.frequency.exponentialRampToValueAtTime(isBusy ? 1200 : 200, ctx.currentTime + 0.1);
           gain.gain.setValueAtTime(0, ctx.currentTime);
           gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
           gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
           osc.start(ctx.currentTime);
           osc.stop(ctx.currentTime + 0.1);
        }
    } catch(e) {}
  };

  return (
    <>
      <div 
        ref={orbRef}
        className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 cursor-pointer shrink-0"
        onClick={handleClick}
      >
        {isBusy ? (
          <motion.div 
            className="relative flex items-center justify-center w-full h-full"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Core Orb */}
            <div className="absolute inset-1.5 bg-gradient-to-tr from-rose-500 via-amber-500 to-orange-400 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)] z-10 flex items-center justify-center overflow-hidden">
               <Activity size={16} className="text-white/90 animate-pulse" />
            </div>
            {/* Energy Particles */}
            <div className="absolute inset-0 bg-amber-400/40 rounded-full blur-[8px]" />
            <div className="absolute inset-[-4px] border-2 border-amber-500/30 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
          </motion.div>
        ) : (
          <motion.div 
            className="relative flex items-center justify-center w-full h-full"
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Core Orb */}
            <div className="absolute inset-2 bg-gradient-to-tr from-teal-400 via-emerald-400 to-cyan-300 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 flex items-center justify-center overflow-hidden">
               <Waves size={14} className="text-white/80" />
            </div>
            {/* Calm Aura */}
            <div className="absolute inset-1 bg-emerald-400/20 rounded-full blur-[4px]" />
            {/* Gentle expansion */}
            <motion.div 
              className="absolute inset-0 border border-teal-400/20 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </div>

      {showTooltip && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            style={{ top: coords.top, left: coords.left, transform: 'translateX(-50%)' }}
            className="fixed px-4 py-2 bg-slate-900 border border-slate-700/50 rounded-xl z-[999999] shadow-2xl min-w-[140px] text-center pointer-events-none"
          >
            {isBusy ? (
               <div className="space-y-0.5 font-light tracking-wide">
                 <div className="text-slate-100 text-xs font-bold">🔥 وقت الذروة</div>
                 <div className="text-[11px] font-medium text-amber-500">{pendingCount} بانتظار الإجراء</div>
               </div>
            ) : (
               <div className="space-y-0.5 font-light tracking-wide">
                 <div className="text-slate-100 text-xs font-bold">🌊 هدوء ومستقر</div>
                 <div className="text-[11px] font-medium text-emerald-400">لا توجد عمليات معلقة</div>
               </div>
            )}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-700/50 rotate-45" />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default SystemPulseOrb;
