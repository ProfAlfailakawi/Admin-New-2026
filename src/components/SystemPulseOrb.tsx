import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from '../types';
import { Activity, Waves, Coffee } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  data: AppState;
}

type ParticleType = 'spark' | 'bubble' | 'confetti';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: ParticleType;
}

const SystemPulseOrb: React.FC<Props> = ({ data }) => {
  const pendingOrders = (data.orders || []).filter(o => o.status === 'pending' || o.status === 'failed').length;
  const pendingInvoices = (data.invoices || []).filter(i => i.paymentStatus === 'pending' && !i.isDeleted).length;
  const pendingCount = pendingOrders + pendingInvoices;
  const isBusy = pendingCount > 0;
  
  const [showTooltip, setShowTooltip] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [saleAlerts, setSaleAlerts] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);

  // Track completed orders to trigger the Arabic sales shockwave
  const getCompletedCountAndLastAmount = () => {
    const completed = (data.orders || []).filter(
      o => o.status === 'completed' || o.status === 'paid' || o.paymentStatus === 'paid' || o.status === 'delivered'
    );
    return {
      count: completed.length,
      lastAmount: completed[completed.length - 1]?.totalAmount || 0
    };
  };

  const initialCompletedInfo = useRef(getCompletedCountAndLastAmount());

  // Function to synthesize a warm, resonant Arabic chime / golden palace bell tone
  const playArabicBell = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Traditional Arabic modal micro-detuned warm bell harmonics (emphasizing major third key relationships: A, C#, E, G#)
      const freqs = [329.63, 440.00, 554.37, 659.25, 880.00, 1109.00];
      const gains = [0.35, 0.40, 0.30, 0.25, 0.15, 0.10];
      const decays = [1.8, 1.4, 1.2, 0.9, 0.6, 0.4];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Use a vintage warm mix of sine and triangle wave shapes
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        // Dynamic pitch modulation (vibrato/warm detune)
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gains[idx] * 0.4, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decays[idx]);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + decays[idx]);
      });
    } catch (e) {
      console.warn("Failed to play dynamic Arabesque chime sound:", e);
    }
  };

  const triggerSaleShockwave = (amount: number) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (orbRef.current) {
      const rect = orbRef.current.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    
    const newAlert = {
      id: Date.now() + Math.random(),
      x,
      y,
      amount
    };
    setSaleAlerts(prev => [...prev, newAlert]);
    playArabicBell();
    
    setTimeout(() => {
      setSaleAlerts(prev => prev.filter(a => a.id !== newAlert.id));
    }, 5000);
  };

  useEffect(() => {
    const currentCompleted = getCompletedCountAndLastAmount();
    // Fire only if the count of completed/paid orders has actually increased
    if (currentCompleted.count > initialCompletedInfo.current.count) {
      triggerSaleShockwave(currentCompleted.lastAmount);
    }
    initialCompletedInfo.current = currentCompleted;
  }, [data.orders]);

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

  const handleInteraction = (e: React.MouseEvent) => {
    setShowTooltip(!showTooltip);
    const rect = orbRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : e.clientX;
    const y = rect ? rect.top + rect.height / 2 : e.clientY;

    if (isBusy) {
      // Create sparks
      const sparks = Array.from({ length: 15 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 15 + (Math.random() * 0.5);
        const speed = 3 + Math.random() * 4;
        return {
          id: Date.now() + i,
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          type: 'spark' as ParticleType
        };
      });
      setParticles(p => [...p, ...sparks]);
    } else {
      // Check for zen reward
      if (!showReward) {
        setShowReward(true);
        // Confetti burst from center of screen
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const confetti = Array.from({ length: 40 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 40 + (Math.random() * 0.5);
          const speed = 4 + Math.random() * 8;
          return {
            id: Date.now() + i,
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 5, // shoot slightly upwards
            life: 1,
            type: 'confetti' as ParticleType
          };
        });
        setParticles(p => [...p, ...confetti]);
        setTimeout(() => setShowReward(false), 4500);
      } else {
        // Just calm bubbles
        const bubbles = Array.from({ length: 8 }).map((_, i) => {
          const angle = -Math.PI / 2 + (Math.random() - 0.5);
          const speed = 1 + Math.random() * 3;
          return {
            id: Date.now() + i,
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            type: 'bubble' as ParticleType
          };
        });
        setParticles(p => [...p, ...bubbles]);
      }
    }

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

  useEffect(() => {
    if (particles.length === 0) return;
    let animationFrameId: number;
    let lastTime = performance.now();
    
    const updateParticles = (time: number) => {
      // const dt = (time - lastTime) / 16;
      lastTime = time;

      setParticles(prev => prev.map(p => {
        let { x, y, vx, vy, life, type } = p;
        x += vx;
        y += vy;
        if (type === 'spark') {
           vy += 0.3; // gravity
           life -= 0.02;
        } else if (type === 'bubble') {
           x += Math.sin(y * 0.05) * 0.8; // wobble
           life -= 0.015;
        } else if (type === 'confetti') {
           vy += 0.2; // gravity
           vx *= 0.96; // friction
           life -= 0.008;
        }
        return { ...p, x, y, vx, vy, life };
      }).filter(p => p.life > 0));
      animationFrameId = requestAnimationFrame(updateParticles);
    };

    animationFrameId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animationFrameId);
  }, [particles.length]);

  return (
    <>
      <div 
        ref={orbRef}
        className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 cursor-pointer shrink-0"
        onClick={handleInteraction}
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

      {createPortal(
        <>
          {/* Theme Glow */}
          <div 
            className="fixed inset-0 pointer-events-none transition-all duration-[3000ms] z-[9900]"
            style={{
              boxShadow: isBusy ? 'inset 0 0 150px rgba(245,158,11,0.12)' : 'inset 0 0 150px rgba(16,185,129,0.08)',
              background: isBusy ? 'transparent' : 'radial-gradient(circle at 50% -20%, rgba(16,185,129,0.03), transparent 60%)'
            }}
          />

          {/* Particles */}
          {particles.map(p => {
            if (p.type === 'spark') {
              return (
                <div
                  key={p.id}
                  className="fixed w-2 h-2 bg-amber-400 rounded-full pointer-events-none z-[9991]"
                  style={{
                    left: p.x, top: p.y,
                    opacity: p.life,
                    transform: `translate(-50%, -50%) scale(${p.life})`,
                    boxShadow: '0 0 8px rgba(245,158,11,0.8)'
                  }}
                />
              );
            }
            if (p.type === 'bubble') {
              return (
                <div
                  key={p.id}
                  className="fixed w-3 h-3 border border-emerald-300 rounded-full pointer-events-none z-[9991]"
                  style={{
                    left: p.x, top: p.y,
                    opacity: p.life,
                    transform: `translate(-50%, -50%) scale(${p.life * 1.5})`,
                    boxShadow: 'inset 0 0 4px rgba(16,185,129,0.4)'
                  }}
                />
              );
            }
            if (p.type === 'confetti') {
              const colors = ['bg-rose-500', 'bg-amber-400', 'bg-emerald-400', 'bg-blue-400', 'bg-purple-400'];
              const color = colors[p.id % colors.length];
              return (
                <div
                  key={p.id}
                  className={cn("fixed w-2.5 h-6 pointer-events-none z-[9991] rounded-sm", color)}
                  style={{
                    left: p.x, top: p.y,
                    opacity: p.life,
                    transform: `translate(-50%, -50%) rotate(${p.vx * 30}deg) scale(${p.life})`
                  }}
                />
              );
            }
            return null;
          })}

          {/* Zen Minigame Reward Message */}
          <AnimatePresence>
            {showReward && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl px-10 py-8 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] z-[99999] flex flex-col items-center gap-5 text-center border border-slate-100"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-inner">
                  <Coffee size={36} className="animate-bounce" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">تقدر تريح الحين ☕️</h2>
                  <p className="text-sm font-bold text-slate-500">شطبت كل التزاماتك بنجاح، بطل!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sale Alert Overlay with Shockwaves */}
          <AnimatePresence>
            {saleAlerts.map((alert) => (
              <div key={alert.id} className="fixed inset-0 pointer-events-none z-[99999]">
                {/* Wave 1: Golden-Amber Shockwave */}
                <motion.div
                  initial={{ x: alert.x, y: alert.y, scale: 0, opacity: 1 }}
                  animate={{
                    scale: 35,
                    opacity: 0,
                  }}
                  transition={{ duration: 2.2, ease: "easeOut" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-amber-400 bg-radial-gradient from-amber-400/10 via-transparent to-transparent shadow-[0_0_80px_rgba(245,158,11,0.35)]"
                  style={{
                    width: "120px",
                    height: "120px",
                    left: alert.x,
                    top: alert.y
                  }}
                />

                {/* Wave 2: Purple-Cosmic Shockwave */}
                <motion.div
                  initial={{ x: alert.x, y: alert.y, scale: 0, opacity: 0.8 }}
                  animate={{
                    scale: 45,
                    opacity: 0,
                  }}
                  transition={{ duration: 2.6, delay: 0.15, ease: "easeOut" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-purple-500 bg-radial-gradient from-purple-500/10 via-transparent to-transparent shadow-[0_0_65px_rgba(168,85,247,0.25)]"
                  style={{
                    width: "120px",
                    height: "120px",
                    left: alert.x,
                    top: alert.y
                  }}
                />

                {/* Wave 3: Inner golden ripple */}
                <motion.div
                  initial={{ x: alert.x, y: alert.y, scale: 0, opacity: 1 }}
                  animate={{
                    scale: 20,
                    opacity: 0
                  }}
                  transition={{ duration: 1.3, ease: "easeOut" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300 bg-transparent shadow-[0_0_30px_rgba(253,224,71,0.4)]"
                  style={{
                    width: "120px",
                    height: "120px",
                    left: alert.x,
                    top: alert.y
                  }}
                />

                {/* Ambient flash */}
                <motion.div
                  initial={{ opacity: 0.25 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 bg-gradient-to-tr from-amber-400/5 via-purple-950/10 to-transparent backdrop-blur-[0.5px]"
                />

                {/* Floating Banner */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
                  animate={{
                    opacity: [0, 1, 1, 1, 0],
                    y: ["-50%", "-50%", "-50%", "-50%", "-55%"],
                    scale: [0.9, 1.05, 1, 1, 0.95]
                  }}
                  transition={{
                    times: [0, 0.15, 0.25, 0.85, 1],
                    duration: 4.5,
                    ease: "easeInOut"
                  }}
                  style={{ left: "50%", top: "50%" }}
                  className="absolute pointer-events-auto flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-950/95 border-2 border-amber-400 shadow-[0_25px_80px_rgba(245,158,11,0.4)] backdrop-blur-2xl text-center min-w-[320px] max-w-sm"
                >
                  <div className="absolute -top-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-6 py-1 rounded-full shadow-[0_8px_20px_rgba(245,158,11,0.3)] tracking-widest">
                    ✦ مبيعات جديدة دخلت الخزينة ✦
                  </div>

                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center mb-3 mt-1 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <motion.span 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-2xl"
                    >
                      💰
                    </motion.span>
                  </div>

                  <h3 className="text-sm font-black text-white/70 mb-0.5 animate-pulse">تفاصيل العملية الناجحة</h3>
                  
                  <div className="text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow mb-1 font-mono" dir="rtl">
                    {alert.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                  </div>

                  <p className="text-[10px] font-bold text-amber-200/80 leading-5">
                    تم تحديث الخزينة بنجاح ونقش العملية الرقمية في قواميس التراث
                  </p>
                </motion.div>
              </div>
            ))}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div 
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                style={{ top: coords.top, left: coords.left, transform: 'translateX(-50%)' }}
                className="fixed px-4 py-2 bg-slate-900 border border-slate-700/20 rounded-xl z-[99999] shadow-xl min-w-[140px] text-center pointer-events-none"
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
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-700/20 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
};

export default SystemPulseOrb;
