/**
 * مكان واحد يقرر ماذا يفعل زر «تثبيت التطبيق».
 *
 *  - داخل تطبيق آيفون (Capacitor): لا يظهر أي عرض تثبيت.
 *  - آيفون/آيباد في المتصفح: يفتح صفحة التطبيق في App Store.
 *  - أندرويد: يفتح Google Play (PLAY_STORE_URL)؛ ولو أُفرغ يعود التثبيت على الشاشة الرئيسية كما كان.
 *  - الحاسوب: بلا تغيير (نافذة التثبيت من المتصفح).
 */
export const APP_STORE_URL = 'https://apps.apple.com/kw/app/id6834583493';
/** صفحة التطبيق في Google Play. الفارغ = يبقى التثبيت على الشاشة الرئيسية في أندرويد. */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=kw.edu.alturath.admin';

export type InstallPlatform = 'ios' | 'android' | 'desktop';

export interface InstallEnv {
  userAgent?: string;
  maxTouchPoints?: number;
  nativeShell?: boolean;
}

export function detectInstallPlatform(userAgent = '', maxTouchPoints = 0): InstallPlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
  // iPadOS يعرّف نفسه كجهاز Mac؛ اللمس يفرّقه عن Mac حقيقي.
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

export function isNativeShell(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try { return Boolean(cap?.isNativePlatform?.()); } catch { return false; }
}

function readEnv(env: InstallEnv = {}): Required<InstallEnv> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    userAgent: env.userAgent ?? String(nav?.userAgent || ''),
    maxTouchPoints: env.maxTouchPoints ?? Number(nav?.maxTouchPoints || 0),
    nativeShell: env.nativeShell ?? isNativeShell(),
  };
}

/** هل يجوز عرض أي واجهة تثبيت؟ (لا، داخل تطبيق آيفون). */
export function canOfferInstall(env?: InstallEnv): boolean {
  return !readEnv(env).nativeShell;
}

/** صفحة المتجر التي يفتحها الزر، أو null للرجوع إلى تثبيت الشاشة الرئيسية. */
export function installStoreUrl(
  env?: InstallEnv,
  urls: { appStore: string; playStore: string } = { appStore: APP_STORE_URL, playStore: PLAY_STORE_URL },
): string | null {
  const e = readEnv(env);
  if (e.nativeShell) return null;
  const platform = detectInstallPlatform(e.userAgent, e.maxTouchPoints);
  if (platform === 'ios') return urls.appStore || null;
  if (platform === 'android') return urls.playStore || null;
  return null;
}
