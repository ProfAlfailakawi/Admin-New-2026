/*
 * Draw-in / count-up / change-highlight helpers — presentation only.
 *
 * They reuse the journey machinery (session play-once store, reduced-motion
 * check) and never decide any value: the final state is what is rendered
 * whenever motion cannot or should not play (no IntersectionObserver, reduced
 * motion, hidden tab, already played this session, no playKey).
 *
 * phase: 'final' = draw the real thing now · 'pre' = armed, show the empty
 * start state · 'play' = the one-time draw is running.
 */
import * as React from 'react';
import { hasJourneyPlayed, markJourneyPlayed } from './useJourneyReveal';

export type DrawPhase = 'final' | 'pre' | 'play';

const KEY = (k: string) => `draw:${k}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Synchronous decision (no flash of the final value before an intro). */
export function canPlayDraw(playKey?: string | null, enabled = true): boolean {
  if (!enabled || !playKey) return false;
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  return !hasJourneyPlayed(KEY(playKey));
}

export interface UseDrawInOptions {
  playKey?: string;
  threshold?: number;
  enabled?: boolean;
  /** Stay armed but do not observe yet (e.g. the value is still 0 while data loads). */
  hold?: boolean;
}

export function useDrawIn<T extends Element = HTMLElement>({ playKey, threshold = 0.4, enabled = true, hold = false }: UseDrawInOptions) {
  const ref = React.useRef<T | null>(null);
  const [phase, setPhase] = React.useState<DrawPhase>(() => (canPlayDraw(playKey, enabled) ? 'pre' : 'final'));

  React.useEffect(() => {
    if (phase !== 'pre' || hold) return;
    const el = ref.current;
    if (!el) {
      setPhase('final');
      return;
    }
    // Never hide the real state indefinitely if the observer is silent.
    const silent = window.setTimeout(() => {
      io.disconnect();
      setPhase('final');
    }, 3000);
    const io = new IntersectionObserver(
      (entries) => {
        window.clearTimeout(silent);
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= threshold - 0.01)) {
          io.disconnect();
          markJourneyPlayed(KEY(playKey as string));
          setPhase('play');
        }
      },
      { threshold: [0, threshold] },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(silent);
      io.disconnect();
    };
  }, [phase, hold, playKey, threshold]);

  // Rings/bars/donuts never call finish(): settle after the draw so later value changes use the kit's plain transition.
  React.useEffect(() => {
    if (phase !== 'play') return;
    const t = window.setTimeout(() => setPhase('final'), 2600);
    return () => window.clearTimeout(t);
  }, [phase]);

  const finish = React.useCallback(() => setPhase((p) => (p === 'play' ? 'final' : p)), []);
  return { ref, phase, finish };
}

/* ------------------------------------------------------------ count-up */

export interface ParsedCount {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
  arabic: boolean;
  raw: string;
}

const AR = '٠١٢٣٤٥٦٧٨٩';
const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[٬]/g, ',').replace(/[٫]/g, '.');
const toArabic = (s: string) => s.replace(/\d/g, (d) => AR[Number(d)]);

/** Find the first number in an already formatted string; null when there is none. */
export function parseCountText(text: string): ParsedCount | null {
  const m = /[\d٠-٩][\d٠-٩,.٬٫]*/.exec(text);
  if (!m) return null;
  const raw = m[0].replace(/[,.٬٫]+$/, '');
  const latin = toLatin(raw);
  const grouped = latin.includes(',');
  const dot = latin.lastIndexOf('.');
  const decimals = dot >= 0 ? latin.length - dot - 1 : 0;
  const target = Number(latin.replace(/,/g, ''));
  if (!Number.isFinite(target)) return null;
  return {
    prefix: text.slice(0, m.index),
    suffix: text.slice(m.index + raw.length),
    target,
    decimals,
    grouped,
    arabic: /[٠-٩]/.test(raw),
    raw,
  };
}

export function formatCountFrame(p: ParsedCount, v: number): string {
  let s = grouped(v, p);
  if (p.arabic) s = toArabic(s);
  return `${p.prefix}${s}${p.suffix}`;
}
function grouped(v: number, p: ParsedCount) {
  return p.grouped ? v.toLocaleString('en-US', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }) : v.toFixed(p.decimals);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Returns the text to display for `text`. Final text whenever motion is off or
 * already played; otherwise counts 0 -> value once, then snaps on later changes.
 */
export function useCountUpText(text: string, { playKey, durationMs = 700, threshold = 0.4, enabled = true }: { playKey?: string; durationMs?: number; threshold?: number; enabled?: boolean }) {
  const parsed = React.useMemo(() => parseCountText(text), [text]);
  const usable = enabled && !!parsed;
  const { ref, phase, finish } = useDrawIn<HTMLSpanElement>({ playKey, threshold, enabled: usable, hold: !parsed || parsed.target === 0 });
  const [progress, setProgress] = React.useState(0);
  const parsedRef = React.useRef(parsed);
  parsedRef.current = parsed;

  React.useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      setProgress(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, durationMs, finish]);

  let shown = text;
  if (parsed && phase !== 'final') {
    const v = phase === 'pre' ? 0 : parsed.target * progress;
    shown = phase === 'pre' && parsed.target === 0 ? text : formatCountFrame(parsed, v);
  }
  return { ref, shown, animating: phase !== 'final' && !!parsed };
}

/**
 * Count-up for an already formatted value ("1,234.500 د.ك", "٤٥٪", 12).
 * The final text is exactly the text passed in; screen readers always get it.
 */
export function DnaCountUp({
  text,
  playKey,
  durationMs,
  className,
  style,
  as: Tag = 'span',
}: {
  text: string | number;
  playKey?: string;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: 'span' | 'div' | 'strong' | 'b';
}) {
  const full = String(text);
  const { ref, shown, animating } = useCountUpText(full, { playKey, durationMs });
  const Root = Tag as React.ElementType;
  if (!animating) {
    return (
      <Root className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
        {full}
      </Root>
    );
  }
  return (
    <Root className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      <span ref={ref} aria-hidden="true">
        {shown}
      </span>
      <span style={SR_ONLY}>{full}</span>
    </Root>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ----------------------------------------------------- change highlight */

/**
 * true for `ms` after `value` changes (never on first render, never loops).
 * `when(prev, next)` can limit it, e.g. only when a count rises.
 */
export function useChangeFlash<V>(value: V, { ms = 1200, when }: { ms?: number; when?: (prev: V, next: V) => boolean } = {}) {
  const prev = React.useRef(value);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    if (Object.is(prev.current, value)) return;
    const before = prev.current;
    prev.current = value;
    // The previous run's cleanup already cancelled its reset timer: a rejected follow-up change must clear the flash itself.
    if (when && !when(before, value)) { setOn(false); return; }
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return on;
}

/* ------------------------------------------------------- chart draw-in */

/**
 * For a recharts wrapper (recharts' own animation stays off): once on first view the line draws from the
 * right edge toward the left (Arabic reading direction), then the area fill fades in. Pure Web Animations
 * on the already-rendered SVG paths; data is never touched. Put `className="dna-chart-draw"` and
 * `data-draw={phase === 'final' ? undefined : phase}` on the wrapper.
 */
export function useChartDrawIn({ playKey, durationMs = 900 }: { playKey?: string; durationMs?: number }) {
  const { ref, phase } = useDrawIn<HTMLDivElement>({ playKey, threshold: 0.3 });
  React.useLayoutEffect(() => {
    if (phase !== 'play') return;
    const root = ref.current;
    if (!root) return;
    let raf = 0;
    let tries = 0;
    const run = () => {
      const line = root.querySelector<SVGPathElement>('.recharts-area-curve');
      if (!line || typeof line.animate !== 'function' || typeof line.getTotalLength !== 'function') {
        if (++tries < 30) raf = requestAnimationFrame(run);
        return;
      }
      const len = Math.ceil(line.getTotalLength());
      const ease = 'cubic-bezier(0.22, 0.78, 0.24, 1)';
      line.animate(
        [
          { strokeDasharray: `${len} ${len}`, strokeDashoffset: -len },
          { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 },
        ],
        { duration: durationMs, easing: ease },
      );
      root.querySelectorAll<SVGElement>('.recharts-area-area').forEach((area) => {
        area.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: durationMs - 100, easing: ease, fill: 'backwards' });
      });
    };
    run();
    return () => cancelAnimationFrame(raf);
  }, [phase, durationMs, ref]);
  return { ref, phase };
}
