/*
 * iPhone Duo markers on <html>, read by src/duo-pattern.css (presentation only).
 * Same detection as the other sites of this family, proven on the real device.
 * - data-shell: "app" inside the iOS app (Capacitor) or a home-screen app, else "browser".
 * - data-device: "duo" only on an iPhone (user agent) or the Capacitor iOS shell whose screen's
 *   short side is 720 or less (every iPad is 744 or more), and then any one of:
 *     1) a near-square screen: short side 400-720 and long/short <= 1.62 (every iPhone is >= 1.78);
 *     2) the same on screen.avail* (it can differ from screen.* after folding or opening);
 *     3) a viewport whose short side is 500-720 (no iPhone reaches 500; the Duo inner screen is 669).
 *   iPhone and iPad layouts therefore never change.
 * - data-widget-side: where iOS reports the clock column through safe-area insets
 *   (left/right/none). In Safari it follows Safari's own floating buttons, if any.
 * Safari on the Duo exposes no hinge API, so nothing here depends on one.
 */
export function isDuoScreen(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.device === 'duo';
}

export function installDuoMarkers(): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  };
  const isApp = !!w.Capacitor?.isNativePlatform?.()
    || !!window.matchMedia?.('(display-mode: standalone)')?.matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
  root.dataset.shell = isApp ? 'app' : 'browser';

  const isAppleHandheld = () => /iPhone|iPod/.test(navigator.userAgent) || w.Capacitor?.getPlatform?.() === 'ios';
  const nearSquare = (a: number, b: number) => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return lo >= 400 && lo <= 720 && hi / lo <= 1.62;
  };
  const markDevice = () => {
    const shortScreen = Math.min(screen.width, screen.height);
    const viewportShort = Math.min(window.innerWidth, window.innerHeight);
    const duo = isAppleHandheld() && shortScreen <= 720 && (
      nearSquare(screen.width, screen.height)
      || nearSquare(screen.availWidth, screen.availHeight)
      || (viewportShort > 500 && viewportShort <= 720)
    );
    root.dataset.device = duo ? 'duo' : 'other';
  };
  markDevice();
  window.addEventListener('resize', markDevice);
  window.addEventListener('orientationchange', () => window.setTimeout(markDevice, 300));

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;'
    + 'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
  root.appendChild(probe);
  const markWidgetSide = () => {
    const cs = getComputedStyle(probe);
    const l = parseFloat(cs.paddingLeft) || 0;
    const r = parseFloat(cs.paddingRight) || 0;
    root.dataset.widgetSide = l > 20 && l > r ? 'left' : r > 20 ? 'right' : 'none';
  };
  markWidgetSide();
  // The probe is 0x0 and the insets are its padding, so its border box is what changes.
  // Observing the content box never fires on the real device; delayed reads are a fallback.
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(markWidgetSide).observe(probe, { box: 'border-box' });
  for (const ms of [120, 600, 1500, 3000]) window.setTimeout(markWidgetSide, ms);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) markWidgetSide(); });
  window.addEventListener('resize', () => { requestAnimationFrame(markWidgetSide); window.setTimeout(markWidgetSide, 400); });
  window.addEventListener('orientationchange', () => window.setTimeout(markWidgetSide, 400));
}

installDuoMarkers();
