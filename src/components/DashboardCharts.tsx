import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

/* Display-only charts for the dashboard. They draw the series they are handed and compute nothing. */

const PIE_FILLS = ['var(--dna-accent)', 'var(--dna-warn)', 'var(--dna-info)', 'var(--dna-danger)', 'var(--dna-muted)', 'var(--dna-line-2)'];

const tooltipStyle: React.CSSProperties = {
  background: 'var(--dna-surface)',
  border: '1px solid var(--dna-line-2)',
  borderRadius: 12,
  color: 'var(--dna-ink)',
  fontSize: 12,
  direction: 'rtl',
};

export function DailySalesArea({ points }: { points: Array<{ label: string; value: number }> }) {
  if (points.filter((p) => p.value > 0).length < 2) return null;
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-4 md:p-5 shadow-sm text-right" dir="rtl">
      <h3 className="text-sm font-bold text-slate-700 mb-3">المبيعات اليومية · آخر 14 يوماً</h3>
      <div role="img" aria-label="رسم المبيعات اليومية لآخر 14 يوماً" style={{ width: '100%', height: 190 }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dnaSalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dna-accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--dna-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dna-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--dna-muted)' }} interval="preserveStartEnd" />
            <YAxis width={44} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--dna-muted)' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Number(v).toFixed(3)} د.ك`, 'المبيعات']} />
            <Area type="monotone" dataKey="value" stroke="var(--dna-accent)" strokeWidth={2} fill="url(#dnaSalesFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ExpensePie({ slices }: { slices: Array<{ name: string; value: number }> }) {
  const data = slices.filter((s) => s.value > 0);
  if (data.length === 0) return null;
  const total = data.reduce((a, s) => a + s.value, 0);
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-4 md:p-5 shadow-sm text-right" dir="rtl">
      <h3 className="text-sm font-bold text-slate-700 mb-3">توزيع المصروفات حسب الفئة</h3>
      <div className="flex flex-wrap items-center gap-4">
        <div role="img" aria-label="توزيع المصروفات حسب الفئة" style={{ width: 150, height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((s, i) => (
                  <Cell key={s.name} fill={PIE_FILLS[i % PIE_FILLS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${Number(v).toFixed(3)} د.ك`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 min-w-[160px] space-y-1.5 text-xs">
          {data.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2 text-slate-700">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_FILLS[i % PIE_FILLS.length] }} />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="tabular-nums text-slate-500">{Math.round((s.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
