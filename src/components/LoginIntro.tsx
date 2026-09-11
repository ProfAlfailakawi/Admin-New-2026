import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, ChefHat, CreditCard, Bike, Users } from 'lucide-react';

/**
 * LoginIntro — one restrained post-login choreography (~1.15s total).
 *
 * Phase 1 (gather, ~0.55s): five icons (orders, kitchen, payment, delivery,
 * customers) sweep on gentle arcs into a compact cluster at screen center.
 *
 * Phase 2 (handoff, ~0.55s): each icon FLIES TO ITS REAL DESTINATION in the
 * dashboard mounted underneath — found via [data-login-target="…"] markers
 * and measured with getBoundingClientRect (FLIP; no hardcoded coordinates).
 * The veil fades while the icons travel, so the intro elements visibly
 * BECOME the dashboard. An icon whose target is missing or off-screen
 * simply fades out in place / at the viewport edge — the intro never waits.
 *
 * - Plays exactly once per explicit login: armed via armLoginIntro() in the
 *   Login onLogin handler (sessionStorage flag consumed here on mount), so
 *   it never shows on ordinary app opens for an authenticated user.
 * - Mounts only inside the authenticated app shell, i.e. the dashboard is
 *   already rendered underneath with real data; if boot is still syncing,
 *   the shell skeleton shows instead and this overlay still ends on time.
 * - pointer-events: none — never blocks interactivity.
 * - Animates only transform + opacity.
 * - prefers-reduced-motion: renders nothing at all.
 */

const INTRO_FLAG = 'alturath_login_intro';

/** Call at login time to arm the intro for the next dashboard mount. */
export const armLoginIntro = () => {
  try { sessionStorage.setItem(INTRO_FLAG, '1'); } catch { /* noop */ }
};

type TargetKey = 'orders' | 'kitchen' | 'payment' | 'delivery' | 'customers';

const PIECES: Array<{
  key: TargetKey;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  // final cluster slot (px offset from center)
  cx: number; cy: number;
  // scattered start + arc midpoint (px, relative to cluster slot)
  x: number; y: number; mx: number; my: number;
}> = [
  { key: 'orders',    Icon: ClipboardList, cx: -52, cy: -18, x: -110, y: -70, mx: -42, my: -58 },
  { key: 'kitchen',   Icon: ChefHat,       cx: -26, cy: 16,  x: 90,   y: -95, mx: 62,  my: -38 },
  { key: 'payment',   Icon: CreditCard,    cx: 0,   cy: -18, x: 130,  y: 55,  mx: 58,  my: 52 },
  { key: 'delivery',  Icon: Bike,          cx: 26,  cy: 16,  x: -85,  y: 90,  mx: -60, my: 32 },
  { key: 'customers', Icon: Users,         cx: 52,  cy: -18, x: 0,    y: 130, mx: 26,  my: 68 },
];

const GATHER_MS = 550;   // arcs + settle
const FLY_MS = 520;      // FLIP flight to the real dashboard targets
const TOTAL_MS = GATHER_MS + FLY_MS + 80;

type Flight = { dx: number; dy: number; found: boolean };

const LoginIntro: React.FC = () => {
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    let armed = false;
    try {
      armed = sessionStorage.getItem(INTRO_FLAG) === '1';
      if (armed) sessionStorage.removeItem(INTRO_FLAG);
    } catch { /* noop */ }
    if (!armed) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPlay(true);

    // Phase 2: measure the REAL dashboard targets (FLIP) and launch flights.
    const flyTimer = window.setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 28;
      setFlights(
        PIECES.map((piece, i) => {
          const el = iconRefs.current[i];
          const target = document.querySelector<HTMLElement>(`[data-login-target="${piece.key}"]`);
          if (!el || !target) return { dx: 0, dy: 0, found: false };
          const from = el.getBoundingClientRect();
          const to = target.getBoundingClientRect();
          let tx = to.left + to.width / 2;
          let ty = to.top + to.height / 2;
          // If the destination lies outside the viewport, fly toward it but
          // stop at the edge (the icon fades there — a gesture of direction).
          const clamped = tx < margin || tx > vw - margin || ty < margin || ty > vh - margin;
          tx = Math.min(Math.max(tx, margin), vw - margin);
          ty = Math.min(Math.max(ty, margin), vh - margin);
          return {
            dx: tx - (from.left + from.width / 2),
            dy: ty - (from.top + from.height / 2),
            found: !clamped,
          };
        })
      );
    }, GATHER_MS);

    const doneTimer = window.setTimeout(() => setDone(true), TOTAL_MS);
    return () => {
      window.clearTimeout(flyTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (!play || done) return null;

  const flying = flights !== null;

  return (
    <div
      className="fixed inset-0 z-[3000]"
      style={{ pointerEvents: 'none' }}
      dir="ltr"
      aria-hidden="true"
    >
      {/* Veil fades away WHILE the icons travel, revealing the live dashboard
          underneath — the icons themselves stay fully visible in flight. */}
      <motion.div
        className="absolute inset-0 bg-slate-950"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgb(2,6,23), rgb(15,23,42) 70%)' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: flying ? 0 : 1 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      />

      {/* Faint gathering frame — hints "panel", dissolves as icons depart */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-2xl border border-amber-400/35"
        style={{ width: 176, height: 96, marginLeft: -88, marginTop: -48 }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={flying ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
        transition={{ duration: flying ? 0.24 : 0.26, delay: flying ? 0 : 0.32, ease: 'easeOut' }}
      />

      {/* Icons: arc into the cluster, then FLIP-fly onto the real dashboard */}
      {PIECES.map((piece, i) => {
        const flight = flights?.[i];
        return (
          <motion.div
            key={piece.key}
            ref={(el) => { iconRefs.current[i] = el; }}
            className="absolute left-1/2 top-1/2 text-amber-300"
            style={{ marginLeft: piece.cx - 9, marginTop: piece.cy - 9, willChange: 'transform, opacity' }}
            initial={{ opacity: 0, x: piece.x, y: piece.y, scale: 0.7 }}
            animate={
              flying
                ? {
                    // travel to the measured destination; fade near arrival so
                    // the icon melts into the real KPI/section it became
                    opacity: [1, 1, 0],
                    x: flight?.dx ?? 0,
                    y: flight?.dy ?? 0,
                    scale: flight?.found ? 0.85 : 0.6,
                  }
                : {
                    opacity: [0, 1, 1],
                    x: [piece.x, piece.mx, 0],
                    y: [piece.y, piece.my, 0],
                    scale: [0.7, 0.9, 1.06, 1],
                  }
            }
            transition={
              flying
                ? {
                    duration: FLY_MS / 1000,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 0.03,
                    opacity: { duration: FLY_MS / 1000, times: [0, 0.6, 1], delay: i * 0.03 },
                  }
                : {
                    delay: 0.02 + i * 0.03,
                    duration: 0.48,
                    ease: [0.22, 1, 0.36, 1],
                    times: [0, 0.45, 1],
                    scale: { delay: 0.02 + i * 0.03, duration: 0.48, times: [0, 0.45, 0.85, 1], ease: 'easeOut' },
                  }
            }
          >
            <piece.Icon size={18} strokeWidth={1.75} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default LoginIntro;
