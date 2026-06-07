import React, { useEffect, useRef } from 'react';

declare global {
  interface Window { L?: any; __alturathLeafletLoading?: Promise<any>; }
}

type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  count?: number;
  value?: number;
  subtitle?: string;
  color?: string;
  radiusMeters?: number;
  size?: number;
  active?: boolean;
  html?: string;
};

const KUWAIT_CENTER = { lat: 29.32, lng: 47.55 };
const KUWAIT_BOUNDS: [[number, number], [number, number]] = [[28.52, 46.48], [30.10, 48.65]];

const loadLeaflet = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (window.__alturathLeafletLoading) return window.__alturathLeafletLoading;

  window.__alturathLeafletLoading = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-alturath-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-alturath-leaflet', '1');
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return window.__alturathLeafletLoading;
};

const buildIcon = (L: any, marker: Marker) => {
  const color = marker.color || '#10b981';
  const isTouchDevice = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
  const baseSize = marker.size || (marker.active ? 34 : 26);
  const size = isTouchDevice ? Math.max(baseSize, marker.active ? 42 : 36) : Math.max(baseSize, marker.active ? 36 : 30);
  const label = marker.count !== undefined ? marker.count : marker.value !== undefined ? marker.value : '';
  return L.divIcon({
    className: 'alturath-leaflet-marker',
    html: marker.html || `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 10px 28px rgba(15,23,42,.32),0 0 0 ${marker.active ? 8 : 4}px ${color}26;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:10px;">${label || ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const LeafletKuwaitMap: React.FC<{
  markers: Marker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  heightClassName?: string;
  dark?: boolean;
  onMarkerClick?: (marker: Marker) => void;
  showRange?: boolean;
  attributionPrefix?: string;
  fitToMarkers?: boolean;
}> = ({ markers, center = KUWAIT_CENTER, zoom = 8.35, heightClassName = 'h-[560px]', dark = false, onMarkerClick, showRange = false, attributionPrefix, fitToMarkers = false }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const lastViewRef = useRef<string>('');
  const lastBoundsKeyRef = useRef<string>('');
  const didSetInitialKuwaitViewRef = useRef(false);
  const selectedMarkerIdRef = useRef<string>('');
  const lockedViewRef = useRef<{ center: any; zoom: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !L || !hostRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(hostRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: true,
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
          tap: true,
          tapTolerance: 22,
          zoomSnap: 0.25,
          zoomDelta: 0.5,
          attributionControl: true,
        });
        lastViewRef.current = 'kuwait-full-initial';
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: attributionPrefix || '© OpenStreetMap contributors',
        }).addTo(mapRef.current);
        mapRef.current.createPane('alturath-glow');
        mapRef.current.getPane('alturath-glow').style.zIndex = 420;
        mapRef.current.fitBounds(KUWAIT_BOUNDS, { padding: [18, 18], animate: false, maxZoom: 8 });
        didSetInitialKuwaitViewRef.current = true;
      } else {
        // Preserve the user's current zoom/pan after the initial full-Kuwait view.
        // The parent may re-render while selecting markers; do not auto-recenter and confuse the map.
      }
      if (!layerRef.current) layerRef.current = L.layerGroup().addTo(mapRef.current);
      layerRef.current.clearLayers();
      const bounds: any[] = [];
      markers.forEach((marker) => {
        if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
        const point = [marker.lat, marker.lng];
        bounds.push(point);
        if (showRange && marker.radiusMeters) {
          L.circle(point, {
            pane: 'alturath-glow',
            radius: marker.radiusMeters,
            color: marker.color || '#10b981',
            fillColor: marker.color || '#10b981',
            fillOpacity: marker.active ? 0.16 : 0.08,
            weight: marker.active ? 2 : 1,
          }).addTo(layerRef.current);
        }
        const m = L.marker(point, { icon: buildIcon(L, marker), title: marker.name, keyboard: false, bubblingMouseEvents: false, zIndexOffset: marker.active ? 1200 : 900 }).addTo(layerRef.current);
        const valueLine = marker.value !== undefined ? `<div style="color:#d97706;font-weight:900;margin-top:2px">${Number(marker.value || 0).toFixed(2)} د.ك</div>` : '';
        const labelHtml = `<div dir="rtl" style="text-align:right;font-family:system-ui;font-weight:900;min-width:120px"><div style="color:#0f172a;font-size:13px">${marker.name}</div>${marker.subtitle ? `<div style="color:#64748b;font-size:11px;margin-top:4px;font-weight:800">${marker.subtitle}</div>` : ''}${valueLine}</div>`;
        m.bindTooltip(labelHtml, { direction: 'top', offset: [0, -16], opacity: 0.96, sticky: false });
        m.bindPopup(labelHtml, { closeButton: true, autoPan: false, keepInView: false, autoClose: false, closeOnClick: false, offset: [0, -10], className: 'alturath-leaflet-diwaniya-popup' });
        if (marker.active || selectedMarkerIdRef.current === marker.id) {
          setTimeout(() => {
            if (!mapRef.current) return;
            m.openPopup();
            const locked = lockedViewRef.current;
            if (locked) mapRef.current.setView(locked.center, locked.zoom, { animate: false });
          }, 0);
        }
        if (onMarkerClick) m.on('click', (event: any) => {
          if (event?.originalEvent?.preventDefault) event.originalEvent.preventDefault();
          if (event?.originalEvent?.stopPropagation) event.originalEvent.stopPropagation();
          selectedMarkerIdRef.current = marker.id;
          lockedViewRef.current = { center: mapRef.current.getCenter(), zoom: mapRef.current.getZoom() };
          m.openPopup();
          onMarkerClick(marker);
          setTimeout(() => {
            if (!mapRef.current || !lockedViewRef.current) return;
            mapRef.current.setView(lockedViewRef.current.center, lockedViewRef.current.zoom, { animate: false });
            m.openPopup();
          }, 0);
        });
      });
      const boundsKey = bounds.map((point) => `${Number(point[0]).toFixed(5)},${Number(point[1]).toFixed(5)}`).sort().join('|');
      if (fitToMarkers && bounds.length > 1 && !didSetInitialKuwaitViewRef.current && lastBoundsKeyRef.current !== boundsKey) {
        mapRef.current.fitBounds(bounds, { padding: [42, 42], maxZoom: zoom + 2, animate: false });
        lastBoundsKeyRef.current = boundsKey;
      }
      setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 80);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [markers, center.lat, center.lng, zoom, showRange, onMarkerClick, attributionPrefix, fitToMarkers]);

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${dark ? 'border-white/10 bg-slate-50 border border-slate-200 text-slate-900' : 'border-slate-200 bg-slate-100'} shadow-inner ${heightClassName}`} dir="ltr">
      <div ref={hostRef} className="absolute inset-0 z-0" />
      <div className="pointer-events-none absolute inset-0 z-[500] bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.10)_0%,transparent_52%,rgba(15,23,42,0.10)_100%)]" />
      <div className="pointer-events-none absolute top-3 right-3 z-[520] rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-slate-700 shadow border border-white/80" dir="rtl">خريطة تفاعلية دقيقة</div>
    </div>
  );
};

export default LeafletKuwaitMap;
