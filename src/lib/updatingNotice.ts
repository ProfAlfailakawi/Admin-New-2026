/**
 * «نُحدّث البرنامج» داخل التطبيق.
 *
 * أثناء النشر تجيب واجهةُ Google الأمامية طلباتِ /api بصفحة HTML إنجليزية
 * (500/502/503/504) لا يكتبها خادمُنا، فهو يجيب /api بـJSON دائماً. هنا يُعرف ذلك
 * الجواب، ويظهر شريطٌ هادئ واحد أسفل الشاشة، ويُسأل /api/health حتى يعود الخادم،
 * فيختفي الشريط ويُطلق حدث SERVER_BACK_EVENT.
 *
 * المراقبة لا تغيّر أيّ جواب: الطلبُ يعود إلى صاحبه كما جاء، فلا يتغيّر سلوكُ أيّ شاشة.
 */

const UPDATING_STATUSES = new Set([500, 502, 503, 504]);

export const UPDATING_MESSAGE = 'نُحدّث البرنامج الآن ✨ لحظاتٍ ونعود.';
/** يُطلق على window حين يعود الخادم. */
export const SERVER_BACK_EVENT = 'alturath:server-back';
export const HEALTH_URL = '/api/health';

/** جوابُ المنصّة لا جوابُ البرنامج: 5xx بغير JSON. */
export const isPlatformUpdating = (status: number, contentType: string | null | undefined): boolean =>
  UPDATING_STATUSES.has(status) && !String(contentType || '').includes('application/json');

let nativeFetch: typeof fetch | null = null;

/** هل يجيب الخادم أصلاً؟ يُسأل مباشرةً، لا عبر المراقبة أدناه. */
export const serverAnswers = (): Promise<boolean> =>
  (nativeFetch || fetch)(HEALTH_URL, { cache: 'no-store', credentials: 'same-origin' })
    .then((response) => response.ok, () => false);

let notice: HTMLElement | null = null;
const waiting = new Set<() => void>();

/**
 * يُظهر الشريطَ مرّةً واحدة مهما تكرّر الطلب، ويسأل `probe` كل ثلاث ثوانٍ
 * (ويتباطأ إلى خمس عشرة)، فإذا أجاب أخفاه ونادى `onBack` ومن سبقه.
 */
export function showUpdatingNotice(probe: () => Promise<boolean> = serverAnswers, onBack?: () => void): void {
  if (onBack) waiting.add(onBack);
  if (notice || typeof document === 'undefined' || !document.body) return;
  const bar = document.createElement('div');
  bar.className = 'alturath-updating-notice';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.dir = 'rtl';
  bar.textContent = UPDATING_MESSAGE;
  bar.style.cssText = [
    'position:fixed', 'inset-inline:0', 'bottom:max(18px,env(safe-area-inset-bottom))', 'margin:0 auto', 'width:max-content', 'max-width:calc(100vw - 32px)',
    'z-index:2147483000', 'padding:11px 18px', 'border-radius:14px', 'font-family:inherit', 'font-size:14px', 'font-weight:700', 'line-height:1.6',
    'background:var(--dna-surface,#fff)', 'color:var(--dna-ink,#14231a)', 'border:1px solid var(--dna-line-2,rgba(20,35,26,.16))',
    'box-shadow:0 14px 36px rgba(15,61,31,.18)', 'text-align:center', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(bar);
  notice = bar;
  let tries = 0;
  const ask = async () => {
    const back = await probe().catch(() => false);
    if (!back) {
      tries++;
      window.setTimeout(ask, Math.min(15_000, 3000 * Math.pow(1.3, Math.max(0, tries - 5))));
      return;
    }
    bar.remove();
    notice = null;
    const callbacks = [...waiting];
    waiting.clear();
    callbacks.forEach((callback) => { try { callback(); } catch { /* واحدٌ لا يوقف البقية */ } });
    window.dispatchEvent(new Event(SERVER_BACK_EVENT));
  };
  window.setTimeout(ask, 3000);
}

const isOwnApi = (input: RequestInfo | URL): boolean => {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith('/api/') && url.pathname !== HEALTH_URL;
  } catch {
    return false;
  }
};

/**
 * لا يوجد في التطبيق غلافُ fetch مركزي، فتُركَّب هنا مراقبةٌ خفيفة: تنظر في جواب
 * /api من الموقع نفسه، فإن كان جوابَ المنصّة أظهرت الشريط. الجوابُ يُعاد كما هو.
 */
export function installUpdatingWatch(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const w = window as unknown as { __alturathUpdatingWatch?: boolean };
  if (w.__alturathUpdatingWatch) return;
  w.__alturathUpdatingWatch = true;
  const original = window.fetch.bind(window);
  nativeFetch = original;
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const promise = original(input, init);
    if (!isOwnApi(input)) return promise;
    return promise.then((response) => {
      try {
        if (isPlatformUpdating(response.status, response.headers.get('content-type'))) showUpdatingNotice(serverAnswers);
      } catch { /* المراقبة لا تُسقط طلباً */ }
      return response;
    });
  }) as typeof window.fetch;
}
