/*
 * Journey reveal — presentation-only intro for DnaStepper.
 *
 * The step states passed to the stepper are the truth. This hook only decides
 * HOW MANY of the already-true lit stations are shown so far while the intro
 * plays once, after the stepper scrolls into view. It never lights a station
 * past `target` (the number of really done/current stations) and never replays
 * for the same `playKey`. `lit === null` means "settled": render the real
 * states and let the plain CSS transitions handle any later real change.
 */
import * as React from 'react';

const STORAGE_PREFIX = 'dna-journey:';
const played = new Set<string>();

export const journeyStepMs = (count: number) => Math.min(750, Math.max(350, Math.round(4000 / Math.max(1, count))));

export function hasJourneyPlayed(playKey?: string | null): boolean {
  if (!playKey) return false;
  if (played.has(playKey)) return true;
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + playKey) === '1';
  } catch {
    return false;
  }
}

export function markJourneyPlayed(playKey?: string | null) {
  if (!playKey) return;
  played.add(playKey);
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + playKey, '1');
  } catch {
    /* storage unavailable: the module-level set still prevents replays */
  }
}

/** Test helper: forget every remembered key. */
export function resetJourneyPlayed() {
  played.clear();
  try {
    Object.keys(window.sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface JourneyRevealOptions {
  /** Number of stations that are really lit (index of the last non-pending step + 1). */
  target: number;
  count: number;
  stepMs?: number;
  threshold?: number;
  enabled?: boolean;
  /** Keep the intro armed but do not start it yet (e.g. data still loading). */
  hold?: boolean;
  /** Remembers that this entity already played (e.g. the order id). */
  playKey?: string;
}

export function useJourneyReveal({ target, count, stepMs, threshold = 0.5, enabled = true, hold = false, playKey }: JourneyRevealOptions) {
  const ref = React.useRef<HTMLOListElement | null>(null);
  const [lit, setLit] = React.useState<number | null>(null);
  const [visible, setVisible] = React.useState(false);
  const targetRef = React.useRef(target);
  targetRef.current = target;
  const ms = stepMs ?? journeyStepMs(count);

  // Arm before paint so the final state never flashes.
  React.useLayoutEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined' || prefersReducedMotion() || hasJourneyPlayed(playKey)) {
      setLit(null);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // Never hide the real state indefinitely: arm only when the element is measurable, and use a
    // threshold that is attainable for its height (taller than the viewport can never reach 0.5).
    const h = el.getBoundingClientRect().height;
    if (!(h > 0)) {
      setLit(null);
      return;
    }
    const effective = Math.max(0.05, Math.min(threshold, (0.9 * window.innerHeight) / h));
    setLit(0);
    setVisible(false);
    const start = () => {
      markJourneyPlayed(playKey); // started: never replay for this key, even if it unmounts mid-intro
      setVisible(true);
    };
    // Failsafes (never hide the real state indefinitely, never burn the intro for a stepper that is just below the fold):
    //  - `silent`: the observer never delivered ANY entry (a working one reports the initial state right away),
    //    so show the real state without marking it played.
    //  - `stuck`: the element is partly in view but never reaches the ratio (e.g. clipped by a scroller);
    //    the user has seen it, so settle and mark it played. An off-screen element never arms this.
    let silentTimer: number | undefined = window.setTimeout(() => {
      io.disconnect();
      setLit(null);
    }, 3000);
    let stuckTimer: number | undefined;
    const clearTimers = () => {
      window.clearTimeout(silentTimer);
      window.clearTimeout(stuckTimer);
      silentTimer = stuckTimer = undefined;
    };
    const io = new IntersectionObserver(
      (entries) => {
        window.clearTimeout(silentTimer);
        // isIntersecting is true with 1px visible: require the effective ratio too
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= effective - 0.01)) {
          io.disconnect();
          clearTimers();
          start();
          return;
        }
        window.clearTimeout(stuckTimer);
        stuckTimer = undefined;
        if (entries.some((e) => e.isIntersecting)) {
          stuckTimer = window.setTimeout(() => {
            io.disconnect();
            markJourneyPlayed(playKey);
            setLit(null);
          }, 6000);
        }
      },
      { threshold: [0, effective] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playKey, threshold]);

  React.useEffect(() => {
    if (lit === null || !visible || hold) return;
    const goal = targetRef.current;
    if (lit < goal) {
      const t = window.setTimeout(() => setLit((n) => (n === null ? n : Math.min(n + 1, targetRef.current))), lit === 0 ? 120 : ms);
      return () => window.clearTimeout(t);
    }
    // Nothing is really reached yet (all pending, e.g. data still loading): the real state IS all-pending,
    // so keep waiting; the effect re-runs when target grows and the intro then plays.
    if (goal === 0) return;
    // Everything that is really lit has been shown: let the one-shot halo (1.5s) finish, then settle.
    const t = window.setTimeout(() => {
      setLit(null);
    }, Math.max(ms, 1900));
    return () => window.clearTimeout(t);
  }, [lit, visible, hold, ms, playKey, target]);

  return { ref, lit, stepMs: ms };
}
