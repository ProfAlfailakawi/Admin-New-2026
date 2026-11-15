/*
 * ?duo-debug=1 — صفحة تشخيص مخفية لركن الودجت (iPhone Duo). تُحمَّل ديناميكياً فقط عند وجود
 * المعامل. ترسم إطار المنطقة المحجوزة (أحمر شفاف، pointer-events:none) وتعرض لوحة قيم صغيرة
 * خارج المنطقة (أسفل اليسار). لا تلمس المصادقة ولا البيانات.
 */
export function installDuoDebug(): void {
  const doc = document;
  // live calibration on the real device: ?duo-debug=1&duo-w=110&duo-h=270 (only here, never in normal use)
  const qs = new URLSearchParams(window.location.search);
  const ow = Number(qs.get('duo-w')), oh = Number(qs.get('duo-h'));
  if (ow > 0 && ow < 400) doc.documentElement.style.setProperty('--duo-widget-w', `${ow}px`);
  if (oh > 0 && oh < 1200) doc.documentElement.style.setProperty('--duo-widget-h', `${oh}px`);
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;width:var(--duo-widget-w,0px);height:var(--duo-widget-h,0px);padding-right:var(--duo-widget-gap,0px)';
  doc.body.appendChild(probe);

  const frame = doc.createElement('div');
  frame.setAttribute('data-duo-bleed', '');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;top:0;right:0;width:var(--duo-widget-w,0px);height:var(--duo-widget-h,0px);box-sizing:border-box;border:2px solid rgba(220,38,38,.9);background:rgba(220,38,38,.12);pointer-events:none;z-index:2147483646';
  doc.body.appendChild(frame);

  const panel = doc.createElement('pre');
  panel.setAttribute('data-duo-bleed', '');
  panel.setAttribute('dir', 'ltr');
  panel.style.cssText = 'position:fixed;left:6px;bottom:6px;margin:0;max-width:calc(100vw - var(--duo-widget-w,0px) - 20px);padding:8px 10px;border-radius:10px;background:rgba(15,23,42,.88);color:#e2e8f0;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;pointer-events:none;z-index:2147483647';
  doc.body.appendChild(panel);

  const envPx = (side: string) => {
    const t = doc.createElement('div');
    t.style.cssText = `position:fixed;visibility:hidden;padding-${side}:env(safe-area-inset-${side},0px)`;
    doc.body.appendChild(t);
    const v = getComputedStyle(t).getPropertyValue(`padding-${side}`) || '0px';
    t.remove();
    return v;
  };
  const render = () => {
    const cs = getComputedStyle(doc.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim() || '(unset)';
    const w = probe.getBoundingClientRect();
    const vv = window.visualViewport;
    const cap = (window as any).Capacitor;
    const standalone = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    panel.textContent = [
      `zone active: ${w.width > 0 ? 'YES' : 'no'}  (${Math.round(w.width)} x ${Math.round(w.height)} px, physical top-right)`,
      `--duo-widget-w ${v('--duo-widget-w')}  gap ${v('--duo-widget-gap')}`,
      `--duo-widget-h ${v('--duo-widget-h')}  reserve ${v('--duo-reserve')}`,
      `safe-area t/r/b/l: ${envPx('top')} ${envPx('right')} ${envPx('bottom')} ${envPx('left')}`,
      `inner ${window.innerWidth}x${window.innerHeight}  client ${doc.documentElement.clientWidth}x${doc.documentElement.clientHeight}`,
      `visualViewport ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} @${Math.round(vv.offsetLeft)},${Math.round(vv.offsetTop)} s${vv.scale}` : 'n/a'}`,
      `dir ${doc.documentElement.dir || getComputedStyle(doc.body).direction}  scheme ${matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}`,
      `standalone ${standalone}  Capacitor: ${cap?.isNativePlatform?.() ? 'native ' + (cap.getPlatform?.() || '') : 'no'}`,
      `UA token: Safari/ ${/Safari\//.test(navigator.userAgent) ? 'yes (browser)' : 'NO (WKWebView app)'}  Mobile/ ${/Mobile\//.test(navigator.userAgent)}`,
      `context: ${cap?.isNativePlatform?.() || (/iPhone|iPad/.test(navigator.userAgent) && !/Safari\//.test(navigator.userAgent)) ? 'INSTALLED APP' : standalone ? 'PWA standalone' : 'browser'}`,
      `segments h${matchMedia('(horizontal-viewport-segments: 2)').matches ? 2 : 1} v${matchMedia('(vertical-viewport-segments: 2)').matches ? 2 : 1}`,
      'send a screenshot WITH the red frame; adjust duo-w / duo-h until it covers the capsule,',
      'e.g. ?duo-debug=1&duo-w=110&duo-h=270',
    ].join('\n');
  };
  render();
  window.addEventListener('resize', render);
  window.visualViewport?.addEventListener('resize', render);
  window.setInterval(render, 1500);
}
