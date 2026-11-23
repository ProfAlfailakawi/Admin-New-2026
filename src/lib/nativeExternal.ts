/**
 * واتساب والطباعة بمكان واحد.
 *  - المتصفح: كما كان تمامًا (window.open لواتساب، ونافذة جديدة للطباعة).
 *  - داخل تطبيق آيفون: لا نوافذ جديدة؛ واتساب عبر location.href، والطباعة داخل الصفحة
 *    في طبقة (iframe) فيها زرّا «طباعة» و«إغلاق»؛ الزر يستدعي window.print() (يربطه الغلاف الأصلي بطباعة النظام)
 *    وقواعد @media print تخفي بقية التطبيق.
 */
import { isNativeShell } from './installBanner';

/** يفتح رابط واتساب. features تُمرَّر للمتصفح فقط. */
export function openWhatsApp(url: string, features?: string): void {
  if (isNativeShell()) {
    window.location.href = url;
    return;
  }
  if (features === undefined) window.open(url, '_blank');
  else window.open(url, '_blank', features);
}

export interface WhatsAppTab {
  navigate: (url: string) => void;
  discard: () => void;
}

/**
 * للحالات التي يُفتح فيها واتساب بعد عمليات async: المتصفح يحجز التبويب داخل النقرة (كما كان)،
 * والتطبيق لا يحجز شيئًا ويذهب إلى الرابط بـ location.href.
 */
export function claimWhatsAppTab(): WhatsAppTab {
  if (isNativeShell()) {
    return { navigate: (url) => { window.location.href = url; }, discard: () => {} };
  }
  let w: Window | null = null;
  try {
    w = window.open('', '_blank');
  } catch {
    w = null;
  }
  return {
    navigate: (url) => {
      if (w && !w.closed) w.location.href = url;
      else window.open(url, '_blank');
    },
    discard: () => {
      try { w?.close(); } catch { /* already gone */ }
    },
  };
}

const OVERLAY_ID = 'ktk-print-overlay';
const STYLE_ID = 'ktk-print-overlay-style';

const PRINT_CSS = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column}
#${OVERLAY_ID} .ktk-print-bar{display:flex;gap:8px;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;background:#0f172a;direction:rtl}
#${OVERLAY_ID} .ktk-print-bar button{min-height:44px;padding:0 18px;border-radius:12px;border:0;font:700 14px system-ui,sans-serif;color:#fff;background:#0f3d1f}
#${OVERLAY_ID} .ktk-print-bar button.ktk-print-close{background:rgba(255,255,255,.14)}
#${OVERLAY_ID} iframe{flex:1;width:100%;border:0;background:#fff}
@media print{
  body.ktk-printing > *:not(#${OVERLAY_ID}){display:none!important}
  body.ktk-printing #${OVERLAY_ID}{position:static;display:block}
  body.ktk-printing #${OVERLAY_ID} .ktk-print-bar{display:none!important}
  body.ktk-printing #${OVERLAY_ID} iframe{height:var(--ktk-frame-h,100vh)}
}`;

/** يزيل طبقة الطباعة إن وُجدت. */
export function closePrintOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.body.classList.remove('ktk-printing');
}

/**
 * يعرض مستند HTML للطباعة. true إن عُرض/فُتح، false إن مُنعت النافذة (المتصفح فقط).
 */
export function printHtmlDocument(html: string): boolean {
  if (!isNativeShell()) {
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(html);
    w.document.close();
    return true;
  }
  closePrintOverlay();
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
  }
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'معاينة الطباعة');
  const bar = document.createElement('div');
  bar.className = 'ktk-print-bar';
  const frame = document.createElement('iframe');
  frame.title = 'معاينة الطباعة';
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.textContent = 'طباعة';
  // window.print() في الصفحة العليا هو الذي يربطه غلاف التطبيق بطباعة النظام؛ @media print يُظهر الطبقة وحدها.
  printBtn.addEventListener('click', () => window.print());
  frame.addEventListener('load', () => {
    try {
      const h = frame.contentDocument?.documentElement?.scrollHeight;
      if (h) overlay.style.setProperty('--ktk-frame-h', `${h}px`);
    } catch { /* مستند من أصل آخر: يبقى الارتفاع الافتراضي */ }
  });
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ktk-print-close';
  closeBtn.textContent = 'إغلاق';
  closeBtn.addEventListener('click', closePrintOverlay);
  bar.append(printBtn, closeBtn);
  frame.srcdoc = html;
  overlay.append(bar, frame);
  document.body.appendChild(overlay);
  document.body.classList.add('ktk-printing');
  return true;
}
