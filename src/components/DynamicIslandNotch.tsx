import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, CheckCircle2, AlertOctagon, RefreshCw, 
  HelpCircle, Volume2, VolumeX, Smartphone, Play, 
  ChevronDown, ExternalLink, Download, Share2, DollarSign, Clock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Custom event helper to trigger the Island from anywhere
export const triggerDynamicIsland = (payload: {
  status: 'paid' | 'pending' | 'failed';
  invoiceId: string;
  customerName: string;
  amount: number;
  notes?: string;
}) => {
  const event = new CustomEvent('trigger-dynamic-island', { detail: payload });
  window.dispatchEvent(event);
};

export const DynamicIslandNotch: React.FC<{ data?: any }> = ({ data }) => {
  const [islandState, setIslandState] = useState<'idle' | 'wide' | 'expanded'>('idle');
  const [activeItem, setActiveItem] = useState<{
    status: 'paid' | 'pending' | 'failed';
    invoiceId: string;
    customerName: string;
    amount: number;
    notes?: string;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDemoTrigger, setShowDemoTrigger] = useState(true);
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Sound synthesis using Web Audio API
  const playStateSound = (type: 'paid' | 'pending' | 'failed') => {
    if (!soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'paid') {
        // success chime - pristine crystal upward arpeggio
        const playTone = (freq: number, startTime: number, duration: number, vol = 0.25) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.03);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        playTone(523.25, 0, 0.4, 0.2);      // C5
        playTone(659.25, 0.07, 0.4, 0.22);  // E5
        playTone(783.99, 0.14, 0.45, 0.24); // G5
        playTone(1046.50, 0.21, 0.6, 0.26); // C6
        playTone(1318.51, 0.28, 0.8, 0.20); // E6
      } 
      else if (type === 'failed') {
        // failed sound - low minor 6th staccato warning hum with detuning
        const playBuzz = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          
          osc.type = 'sawtooth';
          osc2.type = 'triangle';
          
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          osc.frequency.linearRampToValueAtTime(freq - 25, ctx.currentTime + startTime + duration);
          
          osc2.frequency.setValueAtTime(freq - 4, ctx.currentTime + startTime); // Detune
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, ctx.currentTime);
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gainNode.gain.linearRampToValueAtTime(0.28, ctx.currentTime + startTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
          
          osc.connect(filter);
          osc2.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
          osc2.start(ctx.currentTime + startTime);
          osc2.stop(ctx.currentTime + startTime + duration);
        };
        
        // Double heavy impact pulse
        playBuzz(185.00, 0, 0.25);    // F#3
        playBuzz(146.83, 0.12, 0.45); // D3
      } 
      else if (type === 'pending') {
        // pending pulse - ambient sonar radar radar sweep (double ping)
        const playSonar = (freq: number, startTime: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          filter.Q.setValueAtTime(8, ctx.currentTime + startTime);
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + 1.2);
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + 1.3);
        };
        
        playSonar(987.77, 0);    // B5
        playSonar(987.77, 0.35);  // B5 echo
      }
    } catch (e) {
      console.warn('Audio synthesis blocked by browser permission policy');
    }
  };

  // Listen for custom events to trigger the Dynamic Island
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail) {
        // Clear old timers
        if (autoDismissTimer.current) {
          clearTimeout(autoDismissTimer.current);
        }

        setActiveItem(detail);
        setIslandState('wide');
        playStateSound(detail.status);

        // Auto dismiss from wide to idle after 4.5 seconds
        autoDismissTimer.current = setTimeout(() => {
          setIslandState((prev) => {
            if (prev === 'wide') return 'idle';
            return prev; // if expanded, don't auto-dismiss
          });
        }, 4500);
      }
    };

    window.addEventListener('trigger-dynamic-island', handleTrigger);
    return () => {
      window.removeEventListener('trigger-dynamic-island', handleTrigger);
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [soundEnabled]);

  // Demo simulate trigger
  const runDemoSimulation = (status: 'paid' | 'pending' | 'failed') => {
    // Generate lovely randomized data if we want
    const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const customers = ['ديوانية بوعبدالعزيز', 'ديوانية الغانم', 'محمد الخالدي', 'رائد العتيبي', 'عائلة الصباح الكرام'];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const amount = Number((15 + Math.random() * 240).toFixed(3));
    const notes = status === 'failed' ? 'فشل التحقق من رصيد الكرت (K-Net Network Timeout)' : status === 'pending' ? 'بانتظار اتمام عملية التحصيل البنكي من العميل' : 'تم التحقق من شركة النقل والمصادقة التلقائية للربحية';

    triggerDynamicIsland({
      status,
      invoiceId,
      customerName: customer,
      amount,
      notes
    });
  };

  // Status mapping
  const statusMeta = {
    paid: {
      label: 'تم الدفع بنجاح',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />,
      tag: 'K-Net Approved',
      glow: 'shadow-[0_0_24px_rgba(16,185,129,0.35)]',
    },
    failed: {
      label: 'فشلت عملية الدفع',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      icon: <AlertOctagon className="w-5 h-5 text-rose-400 animate-bounce" />,
      tag: 'Transaction Refused',
      glow: 'shadow-[0_0_24px_rgba(244,63,94,0.35)]',
    },
    pending: {
      label: 'بانتظار الدفع',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />,
      tag: 'Awaiting Authorization',
      glow: 'shadow-[0_0_24px_rgba(245,158,11,0.35)]',
    }
  };

  const getIslandWidthAndHeight = () => {
    switch (islandState) {
      case 'idle':
        return { width: '124px', height: '28px', borderRadius: '40px' };
      case 'wide':
        return { width: '310px', height: '38px', borderRadius: '40px' };
      case 'expanded':
        return { width: 'min(94vw, 395px)', height: '240px', borderRadius: '32px' };
      default:
        return { width: '124px', height: '28px', borderRadius: '40px' };
    }
  };

  const currentMeta = activeItem ? statusMeta[activeItem.status] : null;

  return (
    <>
      {/* 📱 The Elite Virtual iPhone Notch / Dynamic Island */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100000] pointer-events-none select-none flex flex-col items-center">
        <motion.div
          animate={getIslandWidthAndHeight()}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 24,
            mass: 0.9,
          }}
          onClick={() => {
            if (islandState === 'wide') {
              setIslandState('expanded');
            } else if (islandState === 'expanded') {
              setIslandState('wide');
            } else {
              // trigger a surprise success demo if clicked while idle
              runDemoSimulation('paid');
            }
          }}
          className={`bg-zinc-950 text-white shadow-2xl pointer-events-auto cursor-pointer border border-neutral-800/60 overflow-hidden flex flex-col justify-center items-center relative ${currentMeta?.glow || 'shadow-black/70'}`}
        >
          {/* Dynamic Glow Line */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {islandState === 'idle' && (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full h-full px-3 text-[10.5px] font-black text-neutral-400 tracking-wider"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] text-neutral-500">DYNAMIC ISLAND</span>
                <Smartphone className="w-3 h-3 text-neutral-600" />
              </motion.div>
            )}

            {islandState === 'wide' && activeItem && currentMeta && (
              <motion.div
                key="wide-state"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="flex items-center justify-between w-full h-full px-3.5 text-right font-black"
                dir="rtl"
              >
                {/* Left side: Pill badge info */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded-full border border-neutral-800/40">
                    {activeItem.invoiceId}
                  </span>
                  <span className="text-amber-400 text-xs font-mono">{activeItem.amount.toFixed(3)}د.ك</span>
                </div>

                {/* Center: status notification */}
                <span className={`text-[11px] truncate max-w-[110px] ${activeItem.status === 'paid' ? 'text-emerald-400' : activeItem.status === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {activeItem.status === 'paid' ? 'تم الدفع!' : activeItem.status === 'failed' ? 'فشل الدفع' : 'بانتظار الدفع'}
                </span>

                {/* Right side: Interactive Pulse Icon */}
                <div className="flex items-center justify-center">
                  {currentMeta.icon}
                </div>
              </motion.div>
            )}

            {islandState === 'expanded' && activeItem && currentMeta && (
              <motion.div
                key="expanded-state"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full p-4 flex flex-col justify-between text-right"
                dir="rtl"
              >
                {/* Header status */}
                <div className="flex items-center justify-between border-b border-neutral-800/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    {currentMeta.icon}
                    <div>
                      <h5 className="text-[13px] font-black tracking-tight">{currentMeta.label}</h5>
                      <span className="text-[9px] font-mono text-neutral-500 block text-left">{currentMeta.tag}</span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-neutral-400 block">{activeItem.invoiceId}</span>
                    <span className="text-sm font-black text-amber-400">{activeItem.amount.toFixed(3)} د.ك</span>
                  </div>
                </div>

                {/* Client & Description info */}
                <div className="py-2.5 my-1 bg-neutral-900/40 border border-neutral-800/20 rounded-2xl px-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold mb-0.5">العميل والمستفيد:</div>
                  <div className="text-sm font-black text-white">{activeItem.customerName}</div>
                  {activeItem.notes && (
                    <div className="text-[10px] text-neutral-500 truncate mt-1 select-all font-medium leading-4 bg-neutral-950 p-1 px-2 rounded-lg border border-neutral-800/40">
                      {activeItem.notes}
                    </div>
                  )}
                </div>

                {/* Quick actions row */}
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success('تمت محاكاة مشاركة الفاتورة بنجاح!');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/50 text-[10.5px] font-black text-neutral-300 transition"
                  >
                    <Share2 size={13} />
                    <span>مشاركة</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(`جاري تصدير ومزامنة المستند ${activeItem.invoiceId}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/50 text-[10.5px] font-black text-neutral-300 transition"
                  >
                    <Download size={13} />
                    <span>تنزيل PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIslandState('idle');
                    }}
                    className="py-2 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-slate-950 text-[10.5px] font-black transition"
                  >
                    إخفاء الإشعار
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 🚀 Hovering Simulation Suite Widget ("مختبر الدفع والتفاعلات") */}
      <AnimatePresence>
        {showDemoTrigger && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-16 right-4 z-[9999] bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-3xl shadow-xl w-72 text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition"
                onClick={() => setShowDemoTrigger(false)}
              >
                &times;
              </button>
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs text-right">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>مختبر تفاعلات Dynamic Island 🏝️</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed mb-3 font-medium">
              محاكاة وتجربة الإشعار الحركي للنوتش الذكي مع المؤثرات الصوتية الفخمة لمعاملات الدفع والفواتير والطلبات.
            </p>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => runDemoSimulation('paid')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-800 font-bold text-[10px] gap-1 transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px]">✓</div>
                <span>تم الدفع</span>
              </button>

              <button
                type="button"
                onClick={() => runDemoSimulation('pending')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-100 text-amber-800 font-bold text-[10px] gap-1 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                <span>تحت التحصيل</span>
              </button>

              <button
                type="button"
                onClick={() => runDemoSimulation('failed')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-100 text-rose-800 font-bold text-[10px] gap-1 transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white text-[8px] font-black">!</div>
                <span>فشل الدفع</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
              <div className="flex items-center gap-1 font-bold text-slate-400">
                <Smartphone className="w-3 h-3 text-slate-400" />
                <span>انقر النوتش بالأعلى للتصميم الموسع</span>
              </div>
              
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1 font-black px-2 py-1 rounded-lg border transition ${soundEnabled ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
              >
                {soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                <span>{soundEnabled ? 'الصوت مفعّل' : 'صامت'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {!showDemoTrigger && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowDemoTrigger(true)}
            className="fixed bottom-16 right-4 z-[9999] bg-slate-900 border border-slate-800 p-2.5 rounded-full shadow-2xl hover:bg-slate-800 text-white font-black text-[10.5px] items-center gap-1.5 flex transition"
            dir="rtl"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>المختبر التفاعلي</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
