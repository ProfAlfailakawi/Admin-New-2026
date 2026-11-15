/** true inside the Capacitor iOS/Android shell (WKWebView) or an installed PWA. UI-only helper. */
export function isInstalledAppShell(): boolean {
  try {
    const w = window as any;
    if (w.Capacitor?.isNativePlatform?.()) return true;
    if ((navigator as any).standalone === true) return true;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // WKWebView user agent has Mobile/ but no Safari/ token
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && !/Safari\//.test(navigator.userAgent);
  } catch { return false; }
}
