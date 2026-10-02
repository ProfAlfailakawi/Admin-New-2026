import React from 'react';
import type { DnaTone } from './DnaKit';

export interface DnaDonutSlice {
  key: string;
  label: string;
  value: number;
  tone?: DnaTone;
  /** Pre-formatted value shown in the legend (display only). */
  valueLabel?: string;
}

const CYCLE: DnaTone[] = ['accent', 'amber', 'sky', 'coral', 'lilac', 'mint', 'sand', 'slate'];

/**
 * Pure-SVG donut that reuses the DNA tone tokens (no new colours).
 * Presentation only: it just draws the slices it is given.
 */
export function DnaDonut({
  slices,
  size = 120,
  stroke = 16,
  centerLabel,
  centerSub,
  ariaLabel,
  className,
}: {
  slices: DnaDonutSlice[];
  size?: number;
  stroke?: number;
  centerLabel?: React.ReactNode;
  centerSub?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  const data = slices.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = data.reduce((a, s) => a + s.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  let offset = 0;
  return (
    <div className={['dna', className].filter(Boolean).join(' ')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }} role="img" aria-label={ariaLabel}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={mid} cy={mid} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--dna-line)' }} />
          {total > 0 &&
            data.map((s, i) => {
              const len = (s.value / total) * c;
              const gap = data.length > 1 ? Math.min(2, len * 0.2) : 0;
              const el = (
                <circle
                  key={s.key}
                  data-dna-tone={s.tone ?? CYCLE[i % CYCLE.length]}
                  cx={mid}
                  cy={mid}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  style={{ stroke: 'var(--t-fg)' }}
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${mid} ${mid})`}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        {(centerLabel != null || centerSub != null) && (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.2 }}>
            {centerLabel != null && <strong style={{ fontSize: 14, color: 'var(--dna-ink)' }}>{centerLabel}</strong>}
            {centerSub != null && <small style={{ fontSize: 11, color: 'var(--dna-muted)' }}>{centerSub}</small>}
          </div>
        )}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, minWidth: 0, flex: '1 1 140px', maxWidth: 300 }}>
        {data.map((s, i) => (
          <li key={s.key} data-dna-tone={s.tone ?? CYCLE[i % CYCLE.length]} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--dna-ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--t-fg)', flex: '0 0 auto' }} />
            <span style={{ flex: '0 1 auto', minWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ marginInlineEnd: 'auto', color: 'var(--dna-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {s.valueLabel ?? `${Math.round((s.value / (total || 1)) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
