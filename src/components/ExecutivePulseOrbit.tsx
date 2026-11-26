import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Orbit } from "lucide-react";
import { DnaCountUp } from "./dna/DnaKit";
import { cn } from "../lib/utils";
import "./pulse-orbit.css";

/**
 * «مدار النبض» في تبويب النبض التنفيذي — عرض فقط (لا كتابة ولا مستمعين جدد).
 * النواة: هامش الربح للفترة المختارة. ثلاثة أجرام (المبيعات، التكاليف، صافي الربح) تدور
 * بأنصاف أقطار وسرعات وأحجام مشتقة من القيم نفسها المعروضة في بطاقات «الأداء المالي».
 * كل طلب مدفوع جديد يصل في بيانات اللوحة يظهر شهاباً ذهبياً قصيراً يسقط في النواة.
 * تقليل الحركة: مدارات ثابتة وأجرام في مواضع ثابتة، وكل الأرقام ظاهرة.
 */

export interface PulseOrbitOrder {
  id: string;
  total: number;
  time: number;
}

interface Props {
  margin: number;
  sales: number;
  cost: number;
  profit: number;
  periodLabel: string;
  todayPaid: PulseOrbitOrder[];
}

const C = { green: "#0f3d1f", gold: "#D4AF37", copper: "#c8942f", cream: "#fbf7ee" };
const VB = 320;
const MID = VB / 2;
const CORE_R = 44;
const STORAGE_KEY = "adminPulseOrbitCollapsed.v1";

const money = (v: number) =>
  Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

type Meteor = { key: string; angle: number; delay: number };

export function ExecutivePulseOrbit({ margin, sales, cost, profit, periodLabel, todayPaid }: Props) {
  const reduced = usePrefersReducedMotion();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable: the state lasts for this view only */
      }
      return next;
    });

  // Pause the orbit while the card is off screen (battery). Reads nothing, writes nothing.
  const stageRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [collapsed]);

  // Bodies: orbit radius, period and size all follow each value's share of the largest one.
  const bodies = useMemo(() => {
    const raw = [
      { id: "sales", label: "المبيعات", value: Math.max(0, sales), color: C.gold, start: -90 },
      { id: "cost", label: "التكاليف", value: Math.max(0, cost), color: C.copper, start: 30 },
      { id: "profit", label: "صافي الربح", value: Math.max(0, profit), color: "#3f8f5c", start: 150 },
    ];
    const max = Math.max(1e-9, ...raw.map((b) => b.value));
    // The smallest value takes the inner lane and the largest the outer one; the exact share
    // then nudges each body inside its lane, so equal values never overlap.
    const ranked = [...raw].sort((a, b) => a.value - b.value).map((b) => b.id);
    const lanes = [76, 108, 140];
    return raw.map((b) => {
      const share = b.value / max; // 0..1
      const r = lanes[ranked.indexOf(b.id)] + (share - 0.5) * 10;
      const size = 5 + 9 * Math.sqrt(share);
      const period = 9 * Math.pow(r / 100, 1.5) * (1.25 - 0.35 * share); // seconds per turn
      return { ...b, share, r, size, period };
    });
  }, [sales, cost, profit]);

  // Meteors: paid orders of today whose ids were not paid on the previous render. The orders
  // come from the data the dashboard already receives; nothing new is subscribed.
  const seen = useRef<Set<string> | null>(null);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    const ids = todayPaid.map((o) => o.id);
    let fresh: string[];
    if (seen.current === null) {
      // first view: replay today's three latest paid orders once, as an arrival cue
      fresh = [...todayPaid].sort((a, b) => b.time - a.time).slice(0, 3).map((o) => o.id);
      seen.current = new Set(ids);
    } else {
      fresh = ids.filter((id) => !seen.current!.has(id));
      ids.forEach((id) => seen.current!.add(id));
    }
    if (!fresh.length || reduced) return;
    const stamp = Date.now();
    const batch = fresh.slice(0, 6).map((id, i) => {
      let h = 0;
      for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) >>> 0;
      return { key: `${id}:${stamp}`, angle: 200 + (h % 140), delay: i * 420 };
    });
    setMeteors((m) => [...m, ...batch]);
    const last = batch[batch.length - 1];
    timers.current.push(
      window.setTimeout(() => setPulseKey((k) => k + 1), 900),
      window.setTimeout(() => setMeteors((m) => m.filter((x) => !batch.includes(x))), last.delay + 1400),
    );
  }, [todayPaid, reduced]);

  const todayTotal = todayPaid.reduce((a, o) => a + (o.total || 0), 0);
  const latest = todayPaid.reduce<PulseOrbitOrder | null>((a, o) => (!a || o.time > a.time ? o : a), null);
  const animate = !reduced && onScreen;

  return (
    <section
      className="pulse-orbit mb-6 rounded-3xl overflow-hidden border border-[#D4AF37]/25 shadow-sm"
      dir="rtl"
      aria-label={`مدار النبض: هامش الربح ${margin.toFixed(1)}٪`}
      data-animate={animate ? "on" : "off"}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="pulse-orbit-head w-full flex items-center justify-between gap-3 px-4 md:px-6 py-3 text-right"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-[#D4AF37]/15 text-[#D4AF37]">
            <Orbit size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-[#fbf7ee] text-sm md:text-base">مدار النبض</span>
            <span className="block text-[10px] md:text-[11px] font-bold text-[#fbf7ee]/60 truncate">
              هامش الربح في المركز · {periodLabel}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {collapsed && (
            <span className="text-sm font-bold text-[#D4AF37] tabular-nums" dir="ltr">
              {margin.toFixed(1)}%
            </span>
          )}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn("text-[#fbf7ee]/70 transition-transform duration-300", collapsed ? "" : "rotate-180")}
          />
        </span>
      </button>

      {!collapsed && (
        <div className="pulse-orbit-body px-3 md:px-6 pb-5 pt-1">
          <div ref={stageRef} className="pulse-orbit-stage" aria-hidden="true">
            <svg viewBox={`0 0 ${VB} ${VB}`} className="pulse-orbit-svg" focusable="false">
              <defs>
                <radialGradient id="pulseOrbitCore" cx="50%" cy="42%" r="60%">
                  <stop offset="0%" stopColor="#1d5a32" />
                  <stop offset="100%" stopColor={C.green} />
                </radialGradient>
                <radialGradient id="pulseOrbitHalo" cx="50%" cy="50%" r="50%">
                  <stop offset="55%" stopColor={C.gold} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
                </radialGradient>
                <linearGradient id="pulseOrbitTail" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fff6d0" stopOpacity="1" />
                  <stop offset="25%" stopColor={C.gold} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
                </linearGradient>
              </defs>

              {bodies.map((b) => (
                <circle
                  key={`lane-${b.id}`}
                  cx={MID}
                  cy={MID}
                  r={b.r}
                  fill="none"
                  stroke={b.color}
                  strokeOpacity={0.32}
                  strokeWidth={1}
                  strokeDasharray="2 5"
                />
              ))}

              {/* a static start angle, then a CSS spin (none under reduced motion) */}
              {bodies.map((b) => (
                <g key={`body-${b.id}`} transform={`rotate(${b.start} ${MID} ${MID})`}>
                  <g className="pulse-orbit-spin" style={{ animationDuration: `${b.period.toFixed(2)}s` }}>
                    <circle cx={MID + b.r} cy={MID} r={b.size + 5} fill={b.color} opacity={0.18} />
                    <circle cx={MID + b.r} cy={MID} r={b.size} fill={b.color} />
                    <circle cx={MID + b.r - b.size * 0.3} cy={MID - b.size * 0.3} r={b.size * 0.35} fill="#fff" opacity={0.35} />
                  </g>
                </g>
              ))}

              <circle cx={MID} cy={MID} r={CORE_R + 22} fill="url(#pulseOrbitHalo)" />
              <circle
                key={pulseKey}
                className={pulseKey ? "pulse-orbit-flash" : undefined}
                cx={MID}
                cy={MID}
                r={CORE_R + 3}
                fill="none"
                stroke={C.gold}
                strokeWidth={1.5}
              />
              <circle cx={MID} cy={MID} r={CORE_R} fill="url(#pulseOrbitCore)" />

              {meteors.map((m) => (
                <g key={m.key} transform={`translate(${MID} ${MID}) rotate(${m.angle})`}>
                  <g className="pulse-orbit-meteor" style={{ animationDelay: `${m.delay}ms` }}>
                    <line x1={0} y1={0} x2={46} y2={0} stroke="url(#pulseOrbitTail)" strokeWidth={2.4} strokeLinecap="round" />
                    <circle cx={0} cy={0} r={2.6} fill="#fff6d0" />
                  </g>
                </g>
              ))}
            </svg>
            <div className="pulse-orbit-core-label">
              <DnaCountUp
                text={`${margin.toFixed(1)}%`}
                playKey="dash-pulse:orbit-margin"
                durationMs={600}
                className="pulse-orbit-core-num block font-bold text-[#fbf7ee] leading-none"
              />
              <span className="pulse-orbit-core-sub block font-bold text-[#D4AF37]">هامش الربح</span>
            </div>
          </div>

          <ul className="pulse-orbit-legend">
            {bodies.map((b) => (
              <li key={`legend-${b.id}`} className="pulse-orbit-legend-row">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} aria-hidden="true" />
                <span className="flex-1 min-w-0 truncate text-[11px] md:text-xs font-bold text-[#fbf7ee]/75">{b.label}</span>
                <span className="text-sm md:text-base font-bold text-[#fbf7ee] tabular-nums whitespace-nowrap" dir="ltr">
                  <DnaCountUp text={money(b.value)} playKey={`dash-pulse:orbit-${b.id}`} durationMs={600} />{" "}
                  <span className="text-[10px] text-[#fbf7ee]/60">د.ك</span>
                </span>
              </li>
            ))}
            <li className="pulse-orbit-legend-row pulse-orbit-today">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#D4AF37]" aria-hidden="true" />
              <span className="flex-1 min-w-0 text-[11px] md:text-xs font-bold text-[#fbf7ee]/75">
                طلبات مدفوعة اليوم: <span className="tabular-nums text-[#fbf7ee]">{todayPaid.length}</span>
                {latest && (
                  <span className="block text-[10px] text-[#fbf7ee]/55">
                    آخرها <span dir="ltr" className="tabular-nums">{money(latest.total)}</span> د.ك
                  </span>
                )}
              </span>
              <span className="text-sm md:text-base font-bold text-[#D4AF37] tabular-nums whitespace-nowrap" dir="ltr">
                {money(todayTotal)} <span className="text-[10px] text-[#D4AF37]/70">د.ك</span>
              </span>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

export default ExecutivePulseOrbit;
