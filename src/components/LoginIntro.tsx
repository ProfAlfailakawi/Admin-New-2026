import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, ChefHat, CreditCard, Bike, Users } from 'lucide-react';

/**
 * LoginIntro — a single, restrained post-login choreography (~1.2s total).
 *
 * Five small icons (orders, kitchen, payment, delivery, customers) appear
 * scattered, converge into an admin-panel silhouette, then the overlay fades
 * to reveal the real dashboard which is already mounted underneath.
 *
 * - Plays exactly once per login: gated by a sessionStorage flag set in the
 *   Login onLogin handler and consumed (removed) here on mount.
 * - pointer-events: none — never blocks dashboard interactivity.
 * - Animates only transform + opacity (GPU-composited, 60fps).
 * - prefers-reduced-motion: renders nothing at all.
 */

const INTRO_FLAG = 'alturath_login_intro';

/** Call at login time to arm the intro for the next dashboard mount. */
export const armLoginIntro = () => {
  try { sessionStorage.setItem(INTRO_FLAG, '1'); } catch { /* noop */ }
};

const ICONS = [ClipboardList, ChefHat, CreditCard, Bike, Users];

// Scattered start offsets (px, relative to final slot) — small, quick travel.
const SCATTER: Array<{ x: number; y: number }> = [
  { x: -110, y: -70 },
  { x: 90, y: -95 },
  { x: 130, y: 55 },
  { x: -85, y: 90 },
  { x: 0, y: 130 },
];

const TOTAL_MS = 1250;

const LoginIntro: React.FC = () => {
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let armed = false;
    try {
      armed = sessionStorage.getItem(INTRO_FLAG) === '1';
      if (armed) sessionStorage.removeItem(INTRO_FLAG);
    } catch { /* noop */ }
    if (!armed) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPlay(true);
    const t = window.setTimeout(() => setDone(true), TOTAL_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!play || done) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950"
      style={{ pointerEvents: 'none' }}
      dir="ltr"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 0.9, duration: 0.3, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <div className="relative" style={{ width: 176, height: 120 }}>
        {/* Admin-panel silhouette: frame + header + sidebar, fades in as icons land */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-amber-400/40"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.25, ease: 'easeOut' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[22px] border-b border-amber-400/25" />
          <div className="absolute top-[22px] bottom-0 right-0 w-[34px] border-l border-amber-400/25" />
        </motion.div>

        {/* Icons converge into a row inside the panel body */}
        {ICONS.map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-300"
            style={{ left: 10 + i * 26, top: 58 }}
            initial={{ opacity: 0, x: SCATTER[i].x, y: SCATTER[i].y, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ delay: 0.05 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Icon size={18} strokeWidth={1.75} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default LoginIntro;
