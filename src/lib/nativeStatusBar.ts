/**
 * شريط الحالة داخل تطبيق آيفون: يطابق لون الواجهة (غلاف التطبيق داكن #0F172A).
 * يستدعي setStyle من إضافة @capacitor/status-bar إن كانت موجودة في التطبيق الأصلي؛ وإلا لا يفعل شيئًا.
 * خارج التطبيق (المتصفح) لا يلمس شيئًا ولا يسجّل مستمعات.
 * 'DARK' = نص فاتح لخلفية داكنة، 'LIGHT' = نص داكن لخلفية فاتحة (كما في الإضافة).
 */
import { isNativeShell } from './installBanner';

export type StatusBarStyle = 'DARK' | 'LIGHT';
const SHELL_BG = '#0F172A';

interface StatusBarPlugin { setStyle: (o: { style: StatusBarStyle }) => Promise<void> | void }

/** سطوع نسبي لسلسلة لون CSS (rgb/rgba/#hex)؛ null إن تعذّرت القراءة أو كان شفافًا. */
export function luminanceOf(color: string): number | null {
  const c = String(color || '').trim().toLowerCase();
  let r: number, g: number, b: number, a = 1;
  let m = c.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
  } else if ((m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/))) {
    const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
    [r, g, b] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  } else return null;
  if (a === 0) return null;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function styleForBackground(color: string): StatusBarStyle {
  const l = luminanceOf(color) ?? luminanceOf(SHELL_BG)!;
  return l < 0.5 ? 'DARK' : 'LIGHT';
}

function currentBackground(): string {
  for (const el of [document.body, document.documentElement]) {
    const bg = el ? getComputedStyle(el).backgroundColor : '';
    if (luminanceOf(bg) !== null) return bg;
  }
  return SHELL_BG;
}

function plugin(): StatusBarPlugin | null {
  const cap = (globalThis as { Capacitor?: { Plugins?: { StatusBar?: StatusBarPlugin } } }).Capacitor;
  const p = cap?.Plugins?.StatusBar;
  return p && typeof p.setStyle === 'function' ? p : null;
}

export function syncNativeStatusBar(): void {
  if (!isNativeShell()) return;
  const p = plugin();
  if (!p) return;
  try { void Promise.resolve(p.setStyle({ style: styleForBackground(currentBackground()) })).catch(() => {}); } catch { /* الإضافة غير جاهزة */ }
}

export function installNativeStatusBar(): void {
  if (typeof window === 'undefined' || !isNativeShell()) return;
  syncNativeStatusBar();
  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', syncNativeStatusBar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNativeStatusBar(); });
}
