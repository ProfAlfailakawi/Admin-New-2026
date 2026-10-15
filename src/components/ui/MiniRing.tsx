import React from 'react';
import { useDrawIn } from '../dna/useDrawIn';

/**
 * Tiny presentation-only ring. Draws a percentage that the caller ALREADY computed;
 * it never derives, stores or changes any data. Non-finite input renders nothing.
 */
export function MiniRing({
  percent,
  size = 30,
  stroke = 3.5,
  tone = '#d97706',
  label,
  showValue = true,
  className,
  playKey,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  tone?: string;
  label?: string;
  showValue?: boolean;
  className?: string;
  /** Opt-in: the arc draws once (per session) on first view. Omitted = unchanged static ring. */
  playKey?: string;
}) {
  const draw = useDrawIn<HTMLSpanElement>({ playKey, threshold: 0.4 });
  if (!Number.isFinite(percent)) return null;
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      ref={playKey ? draw.ref : undefined}
      className={`mini-ring ${className || ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ? label + ' ' : ''}${Math.round(percent)}%`}
      title={label ? `${label} ${Math.round(percent)}%` : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${draw.phase === 'pre' ? 0 : (pct / 100) * c} ${c}`}
          style={playKey && draw.phase !== 'final' ? { opacity: draw.phase === 'pre' ? 0 : 1, transition: 'stroke-dasharray 0.9s cubic-bezier(0.22, 0.78, 0.24, 1), opacity 0.1s linear' } : undefined}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showValue && <b dir="ltr">{Math.round(percent)}</b>}
    </span>
  );
}

/** Thin share bar (0-100) for a value the caller already has. */
export function MiniBar({ percent, tone = '#d97706', label, className }: { percent: number; tone?: string; label?: string; className?: string }) {
  if (!Number.isFinite(percent)) return null;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <span className={`mini-bar ${className || ''}`} role="img" aria-label={`${label ? label + ' ' : ''}${Math.round(percent)}%`} title={label ? `${label} ${Math.round(percent)}%` : undefined}>
      <i style={{ width: `${pct}%`, background: tone }} />
    </span>
  );
}
