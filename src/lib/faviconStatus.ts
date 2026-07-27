import { useEffect, useRef } from 'react';

type FaviconStatus = 'syncing' | 'attention' | 'complete';

interface LiveFaviconStatusOptions {
  enabled: boolean;
  syncing: boolean;
  attention: boolean;
}

const BASE_FAVICON = '/ios-icon-192-v6.png?v=6.0.0';
const LIVE_FAVICON_ID = 'alturath-live-favicon';
const ICON_SIZE = 192;

const STATUS_COLORS: Record<FaviconStatus, string> = {
  syncing: '#3b82f6',
  attention: '#f59e0b',
  complete: '#10b981',
};

let baseIconPromise: Promise<HTMLImageElement> | null = null;
const renderedStatusCache = new Map<FaviconStatus, string>();

const loadBaseIcon = (): Promise<HTMLImageElement> => {
  if (baseIconPromise) return baseIconPromise;

  baseIconPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the base favicon'));
    image.src = BASE_FAVICON;
  });

  return baseIconPromise;
};

const renderStatusIcon = async (status: FaviconStatus): Promise<string> => {
  const cached = renderedStatusCache.get(status);
  if (cached) return cached;

  const image = await loadBaseIcon();
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  context.drawImage(image, 0, 0, ICON_SIZE, ICON_SIZE);

  // A compact status jewel keeps the brand icon intact and remains readable at tab size.
  const centerX = 148;
  const centerY = 148;
  const outerRadius = 31;
  const innerRadius = 23;

  context.beginPath();
  context.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.98)';
  context.fill();

  context.beginPath();
  context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  context.fillStyle = STATUS_COLORS[status];
  context.fill();

  context.beginPath();
  context.arc(centerX - 7, centerY - 8, 5, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.42)';
  context.fill();

  const dataUrl = canvas.toDataURL('image/png');
  renderedStatusCache.set(status, dataUrl);
  return dataUrl;
};

const applyLiveFavicon = (href: string, status: FaviconStatus) => {
  let link = document.getElementById(LIVE_FAVICON_ID) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = LIVE_FAVICON_ID;
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '192x192';
  }

  link.href = href;
  link.dataset.status = status;

  // Re-appending makes Safari and Chromium refresh the tab icon immediately.
  document.head.appendChild(link);
};

const removeLiveFavicon = () => {
  document.getElementById(LIVE_FAVICON_ID)?.remove();
};

export const useLiveFaviconStatus = ({ enabled, syncing, attention }: LiveFaviconStatusOptions) => {
  const requestIdRef = useRef(0);
  const status: FaviconStatus = syncing ? 'syncing' : attention ? 'attention' : 'complete';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const requestId = ++requestIdRef.current;

    if (!enabled) {
      removeLiveFavicon();
      return;
    }

    renderStatusIcon(status)
      .then((href) => {
        if (requestIdRef.current !== requestId) return;
        applyLiveFavicon(href, status);
      })
      .catch(() => {
        // The original favicon in index.html remains untouched as a safe fallback.
      });
  }, [enabled, status]);

  useEffect(() => () => removeLiveFavicon(), []);
};
