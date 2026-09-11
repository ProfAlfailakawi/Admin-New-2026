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
// mx/my is a midpoint bowed perpendicular to the travel line so each icon
// sweeps in on a gentle arc instead of a straight ray.
const SCATTER: Array<{ x: number; y: number; mx: number; my: number }> = [
  { x: -110, y: -70, mx: -42, my: -58 },
  { x: 90, y: -95, mx: 62, my: -38 },
  { x: 130, y: 55, mx: 58, my: 52 },
  { x: -85, y: 90, mx: -60, my: 32 },
  { x: 0, y: 130, mx: 26, my: 68 },
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
      {/* Subtle radial depth behind the mark — deepens the veil's center */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(2,6,23,0.9), rgba(15,23,42,0.35) 70%)' }}
      />

      {/* Group hands off with a gentle 1.0 → 1.02 scale as the veil fades */}
      <motion.div
        className="relative"
        style={{ width: 176, height: 120 }}
        initial={{ scale: 1 }}
        animate={{ scale: 1.02 }}
        transition={{ delay: 0.9, duration: 0.3, ease: 'easeOut' }}
      >
        {/* Admin-panel silhouette: frame + header + sidebar, snaps in as icons land */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-amber-400/40"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: [0.92, 1.015, 1] }}
          transition={{ delay: 0.45, duration: 0.28, ease: 'easeOut', times: [0, 0.7, 1] }}
        >
          <div className="absolute top-0 left-0 right-0 h-[22px] border-b border-amber-400/25" />
          <div className="absolute top-[22px] bottom-0 right-0 w-[34px] border-l border-amber-400/25" />
        </motion.div>

        {/* Icons sweep in on gentle arcs, then snap into a row inside the panel body */}
        {ICONS.map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-300"
            style={{ left: 10 + i * 26, top: 58 }}
            initial={{ opacity: 0, x: SCATTER[i].x, y: SCATTER[i].y, scale: 0.7 }}
            animate={{
              opacity: [0, 1, 1],
              x: [SCATTER[i].x, SCATTER[i].mx, 0],
              y: [SCATTER[i].y, SCATTER[i].my, 0],
              scale: [0.7, 0.85, 1.08, 1],
            }}
            transition={{
              delay: 0.05 + i * 0.03,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.45, 1],
              scale: { delay: 0.05 + i * 0.03, duration: 0.5, times: [0, 0.45, 0.85, 1], ease: 'easeOut' },
            }}
          >
            <Icon size={18} strokeWidth={1.75} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default LoginIntro;
