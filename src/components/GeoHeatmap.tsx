import React, { useEffect, useMemo, useRef, useState } from 'react';
import LeafletKuwaitMap from './LeafletKuwaitMap';
import { AppState } from '../types';

interface GeoHeatmapProps {
 data: AppState;
}

type MapMarker = {
 name: string;
 lat: number;
 lng: number;
 revenue: number;
 count: number;
 hasLocation: boolean;
};

type Tile = { key: string; url: string; fallbackUrl: string; left: number; top: number };

const MAP_TILE_SIZE = 256;
const MAP_CENTER = { lat: 29.25, lng: 47.65 };
const MAP_CENTER_MOBILE_PORTRAIT = { lat: 29.16, lng: 47.92 };

const toNumber = (value: any) => {
 if (value === undefined || value === null || value === '') return null;
 if (typeof value === 'object' && typeof value.toJSON === 'function') return toNumber(value.toJSON());
 const n = Number(String(value).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٫,]/g, '.'));
 return Number.isFinite(n) ? n : null;
};

const isValidKuwaitLocation = (lat: number | null, lng: number | null) => (
 lat !== null && lng !== null && lat >= 28.45 && lat <= 30.12 && lng >= 46.52 && lng <= 48.45
);

const getLatLng = (item: any) => {
 const candidates = [
  item,
  item?.location,
  item?.geo,
  item?.coordinates,
  item?.mapLocation,
  item?.clientLocation,
  item?.deliveryLocation,
  item?.deliveryInfo,
  item?.deliveryAddress,
  item?.deliveryAddressSnapshot,
  item?.address,
  item?.addressLocation,
  item?.pinLocation,
  item?.geofenceCenter,
  item?.customerLocation,
 ].filter(Boolean);

 for (const loc of candidates) {
  const lat = toNumber(loc?.lat ?? loc?.latitude ?? loc?._lat);
  const lng = toNumber(loc?.lng ?? loc?.longitude ?? loc?.lon ?? loc?._long);
  if (isValidKuwaitLocation(lat, lng)) return { lat: lat as number, lng: lng as number };
 }
 return null;
};

const normalizeArabicText = (value: any) => String(value || '')
 .trim()
 .replace(/[إأآا]/g, 'ا')
 .replace(/[ى]/g, 'ي')
 .replace(/[ة]/g, 'ه')
 .replace(/\s+/g, ' ');

const areaFallbackLocations: Record<string, { lat: number; lng: number }> = {
 'الكويت': { lat: 29.3759, lng: 47.9774 },
 'العاصمه': { lat: 29.3759, lng: 47.9774 },
 'مدينه الكويت': { lat: 29.3759, lng: 47.9774 },
 'شرق': { lat: 29.3797, lng: 47.9900 },
 'المرقاب': { lat: 29.3694, lng: 47.9697 },
 'القبله': { lat: 29.3729, lng: 47.9662 },
 'بنيد القار': { lat: 29.3658, lng: 48.0027 },
 'الدسمه': { lat: 29.3568, lng: 47.9977 },
 'الدعيه': { lat: 29.3556, lng: 48.0157 },
 'المنصوريه': { lat: 29.3562, lng: 47.9858 },
 'النزهه': { lat: 29.3433, lng: 47.9845 },
 'كيفان': { lat: 29.3374, lng: 47.9631 },
 'العديلية': { lat: 29.3329, lng: 47.9822 },
 'العديله': { lat: 29.3329, lng: 47.9822 },
 'الخالدية': { lat: 29.3234, lng: 47.9726 },
 'الخالديه': { lat: 29.3234, lng: 47.9726 },
 'القادسية': { lat: 29.3482, lng: 47.9884 },
 'القادسيه': { lat: 29.3482, lng: 47.9884 },
 'قرطبة': { lat: 29.3136, lng: 47.9853 },
 'قرطبه': { lat: 29.3136, lng: 47.9853 },
 'اليرموك': { lat: 29.3149, lng: 47.9703 },
 'الشامية': { lat: 29.3470, lng: 47.9686 },
 'الشاميه': { lat: 29.3470, lng: 47.9686 },
 'الروضة': { lat: 29.3279, lng: 47.9942 },
 'الروضه': { lat: 29.3279, lng: 47.9942 },
 'ضاحية عبدالله السالم': { lat: 29.3513, lng: 47.9742 },
 'ضاحيه عبدالله السالم': { lat: 29.3513, lng: 47.9742 },
 'حولي': { lat: 29.3375, lng: 48.0286 },
 'السالميه': { lat: 29.3339, lng: 48.0761 },
 'سالميه': { lat: 29.3339, lng: 48.0761 },
 'الجابريه': { lat: 29.3166, lng: 48.0182 },
 'الرميثيه': { lat: 29.3141, lng: 48.0760 },
 'سلوى': { lat: 29.2958, lng: 48.0780 },
 'بيان': { lat: 29.3038, lng: 48.0484 },
 'مشرف': { lat: 29.2921, lng: 48.0379 },
 'السلام': { lat: 29.2952, lng: 48.0064 },
 'حطين': { lat: 29.2890, lng: 48.0177 },
 'الزهراء': { lat: 29.2808, lng: 48.0081 },
 'الشهداء': { lat: 29.2790, lng: 48.0320 },
 'الصديق': { lat: 29.2830, lng: 48.0455 },
 'الفروانيه': { lat: 29.2775, lng: 47.9586 },
 'خيطان': { lat: 29.2866, lng: 47.9682 },
 'العمرية': { lat: 29.2998, lng: 47.9290 },
 'العمريه': { lat: 29.2998, lng: 47.9290 },
 'الرابية': { lat: 29.2927, lng: 47.9333 },
 'الرابيه': { lat: 29.2927, lng: 47.9333 },
 'العارضيه': { lat: 29.2942, lng: 47.8944 },
 'الفردوس': { lat: 29.3026, lng: 47.8685 },
 'جليب الشيوخ': { lat: 29.2705, lng: 47.9440 },
 'اشبيليه': { lat: 29.2980, lng: 47.9035 },
 'الرحاب': { lat: 29.3256, lng: 47.8821 },
 'الاندلس': { lat: 29.3145, lng: 47.8742 },
 'صباح الناصر': { lat: 29.3074, lng: 47.8409 },
 'مبارك الكبير': { lat: 29.1893, lng: 48.0878 },
 'صباح السالم': { lat: 29.2574, lng: 48.0579 },
 'القرين': { lat: 29.1921, lng: 48.0817 },
 'القصور': { lat: 29.2166, lng: 48.0673 },
 'العدان': { lat: 29.2082, lng: 48.0691 },
 'المسايل': { lat: 29.2254, lng: 48.1037 },
 'ابو فطيره': { lat: 29.2034, lng: 48.1065 },
 'ابو الحصاني': { lat: 29.1938, lng: 48.1130 },
 'الفنيطيس': { lat: 29.2224, lng: 48.1017 },
 'صبحان': { lat: 29.2320, lng: 47.9650 },
 'الاحمدي': { lat: 29.0769, lng: 48.0839 },
 'احمدي': { lat: 29.0769, lng: 48.0839 },
 'الفحيحيل': { lat: 29.0825, lng: 48.1304 },
 'المنقف': { lat: 29.0961, lng: 48.1324 },
 'العقيله': { lat: 29.1450, lng: 48.1164 },
 'الرقة': { lat: 29.1464, lng: 48.0944 },
 'الرقي': { lat: 29.1464, lng: 48.0944 },
 'هدية': { lat: 29.1244, lng: 48.0877 },
 'هديه': { lat: 29.1244, lng: 48.0877 },
 'ابو حليفه': { lat: 29.1294, lng: 48.1307 },
 'المهبوله': { lat: 29.1462, lng: 48.1265 },
 'الفنطاس': { lat: 29.1722, lng: 48.1226 },
 'الصباحية': { lat: 29.1144, lng: 48.1087 },
 'الصباحيه': { lat: 29.1144, lng: 48.1087 },
 'الظهر': { lat: 29.1578, lng: 48.0611 },
 'جابر العلي': { lat: 29.1260, lng: 48.0700 },
 'علي صباح السالم': { lat: 28.9280, lng: 48.1630 },
 'ام الهيمان': { lat: 28.9190, lng: 48.1660 },
 'الخيران': { lat: 28.6538, lng: 48.3633 },
 'الوفرة': { lat: 28.6338, lng: 47.9300 },
 'الوفرة الزراعية': { lat: 28.6467, lng: 47.9483 },
 'الوفرة الزراعيه': { lat: 28.6467, lng: 47.9483 },
 'الجهراء': { lat: 29.3375, lng: 47.6581 },
 'الجهره': { lat: 29.3375, lng: 47.6581 },
 'النسيم': { lat: 29.3442, lng: 47.6900 },
 'العيون': { lat: 29.3560, lng: 47.6817 },
 'الواحه': { lat: 29.3474, lng: 47.6685 },
 'تيماء': { lat: 29.3300, lng: 47.6970 },
 'تيما': { lat: 29.3300, lng: 47.6970 },
 'الصليبيه': { lat: 29.2741, lng: 47.8325 },
 'سعد العبدالله': { lat: 29.3005, lng: 47.7162 },
 'القصر': { lat: 29.3467, lng: 47.6462 },
 'النعيم': { lat: 29.3700, lng: 47.6600 },
 'كبد': { lat: 29.1262, lng: 47.6080 },
 'السالمي': { lat: 29.1000, lng: 46.6750 },
};

const getAreaFallbackLocation = (area: string) => {
 const normalized = normalizeArabicText(area);
 if (areaFallbackLocations[normalized]) return areaFallbackLocations[normalized];
 const withoutPrefix = normalized.replace(/^ال/, '');
 return areaFallbackLocations[withoutPrefix] || null;
};

const getAreaName = (item: any, customer: any) => normalizeArabicText(
 item?.area || item?.region || item?.regionName || item?.zoneName || item?.zone ||
 item?.deliveryAddressSnapshot?.area || item?.deliveryAddressSnapshot?.region ||
 item?.address?.area || item?.address?.region || item?.deliveryAddress?.area || item?.deliveryAddress?.region ||
 item?.deliveryInfo?.area || item?.deliveryInfo?.region || customer?.area || customer?.region || customer?.address?.area || customer?.address?.region ||
 'غير محدد'
);

const lonLatToWorldPixel = (lat: number, lng: number, zoom: number) => {
 const sinLat = Math.sin((Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180);
 const scale = MAP_TILE_SIZE * 2 ** zoom;
 return {
  x: ((lng + 180) / 360) * scale,
  y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
 };
};

const GeoHeatmap: React.FC<GeoHeatmapProps> = ({ data }) => {
 const mapRef = useRef<HTMLDivElement | null>(null);
 const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
 const [activeRegion, setActiveRegion] = useState<string | null>(null);

 // Responsive viewport calculation. Display-only: no Geo data, coordinates, or markers are changed.
 const isMobilePortraitMap = Boolean(mapSize.width && mapSize.width < 520 && mapSize.height > mapSize.width * 1.18);
 const mapZoom = useMemo(() => {
   if (!mapSize.width) return 8;
   if (isMobilePortraitMap) return 8;
   if (mapSize.width < 500) return 8;
   if (mapSize.width < 800) return 9;
   return 9.5;
 }, [mapSize.width, isMobilePortraitMap]);
 const displayMapCenter = useMemo(() => (isMobilePortraitMap ? MAP_CENTER_MOBILE_PORTRAIT : MAP_CENTER), [isMobilePortraitMap]);

 useEffect(() => {
  const el = mapRef.current;
  if (!el) return;
  const updateSize = () => {
   const rect = el.getBoundingClientRect();
   setMapSize({ width: rect.width, height: rect.height });
  };
  updateSize();
  const observer = new ResizeObserver(updateSize);
  observer.observe(el);
  window.addEventListener('resize', updateSize);
  return () => {
   observer.disconnect();
   window.removeEventListener('resize', updateSize);
  };
 }, []);

 const mapTiles = useMemo<Tile[]>(() => {
  if (!mapSize.width || !mapSize.height) return [];
  
  // Use a whole number zoom for fetching tiles, but scale them for fractional zooms visually if we want.
  // Actually, standard tile servers only support integer zooms. 
  // Let's stick to an integer zoom level for tiles.
  const tileZoom = Math.floor(mapZoom);
  
  const center = lonLatToWorldPixel(displayMapCenter.lat, displayMapCenter.lng, tileZoom);
  const topLeft = {
   x: center.x - mapSize.width / 2,
   y: center.y - mapSize.height / 2,
  };
  const startX = Math.floor(topLeft.x / MAP_TILE_SIZE);
  const endX = Math.floor((topLeft.x + mapSize.width) / MAP_TILE_SIZE);
  const startY = Math.floor(topLeft.y / MAP_TILE_SIZE);
  const endY = Math.floor((topLeft.y + mapSize.height) / MAP_TILE_SIZE);
  const maxTile = 2 ** tileZoom;
  const tiles: Tile[] = [];
  
  for (let x = startX - 2; x <= endX + 2; x += 1) {
   for (let y = startY - 2; y <= endY + 2; y += 1) {
    if (y < 0 || y >= maxTile) continue;
    const wrappedX = ((x % maxTile) + maxTile) % maxTile;
    tiles.push({
     key: `${tileZoom}-${wrappedX}-${y}`,
     url: `https://a.basemaps.cartocdn.com/rastertiles/voyager/${tileZoom}/${wrappedX}/${y}.png`,
     fallbackUrl: `https://a.basemaps.cartocdn.com/light_all/${tileZoom}/${wrappedX}/${y}.png`,
     left: x * MAP_TILE_SIZE - topLeft.x,
     top: y * MAP_TILE_SIZE - topLeft.y,
    });
   }
  }
  return tiles;
 }, [mapSize.width, mapSize.height, mapZoom, displayMapCenter]);

 const areaData = useMemo(() => {
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const customers = Array.isArray((data as any).customers) ? (data as any).customers : [];
  const customerById = new Map(customers.map((customer: any) => [String(customer?.id || ''), customer]));
  const grouped: Record<string, MapMarker> = {};

  invoices.forEach((inv: any) => {
   const customer = customerById.get(String(inv?.customerId || '')) || null;
   const area = getAreaName(inv, customer) || 'غير محدد';
   const exactLocation = getLatLng(inv) || getLatLng(customer);
   const fallbackLocation = getAreaFallbackLocation(area);
   const location = exactLocation || fallbackLocation;
   if (!location) return;

   const key = area || 'غير محدد';
   if (!grouped[key]) {
    grouped[key] = {
     name: key,
     lat: location.lat,
     lng: location.lng,
     revenue: 0,
     count: 0,
     hasLocation: Boolean(exactLocation),
    };
   } else if (!grouped[key].hasLocation && exactLocation) {
    grouped[key].lat = exactLocation.lat;
    grouped[key].lng = exactLocation.lng;
    grouped[key].hasLocation = true;
   }

   grouped[key].revenue += Number(inv?.totalAmount || inv?.total || inv?.amount || 0);
   grouped[key].count += 1;
  });

  const markers = Object.values(grouped).sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const maxRev = markers.reduce((max, marker) => Math.max(max, marker.revenue), 1);
  return { markers, maxRev };
 }, [data.invoices, (data as any).customers]);

 const getMarkerPoint = (marker: MapMarker) => {
  if (!mapSize.width || !mapSize.height) return null;
  const tileZoom = Math.floor(mapZoom);
  const center = lonLatToWorldPixel(displayMapCenter.lat, displayMapCenter.lng, tileZoom);
  const point = lonLatToWorldPixel(marker.lat, marker.lng, tileZoom);
  return {
   x: mapSize.width / 2 + (point.x - center.x),
   y: mapSize.height / 2 + (point.y - center.y),
  };
 };


 const leafletMarkers = useMemo(() => areaData.markers.map((marker) => {
  const intensity = marker.revenue / areaData.maxRev;
  return {
   id: marker.name,
   name: marker.name,
   lat: marker.lat,
   lng: marker.lng,
   count: marker.count,
   value: marker.revenue,
   subtitle: marker.hasLocation ? 'موقع دقيق من الطلب/العميل' : 'موقع تقريبي حسب المنطقة',
   color: intensity > 0.5 ? '#d97706' : marker.hasLocation ? '#4f46e5' : '#64748b',
   size: 24 + Math.round(intensity * 28),
   active: activeRegion === marker.name,
  };
 }), [areaData.markers, areaData.maxRev, activeRegion]);

 return (
 <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl md:rounded-2xl p-4 shadow-2xl shadow-indigo-900/50 border border-white/10 glass-dark text-white relative overflow-hidden border border-[#f0e6d2]/10">
 <h3 className="text-2xl md:text-3xl font-bold mb-6 sm:mb-8 text-white flex items-center justify-end gap-3 relative z-10 text-right w-full">
 خريطة الذهب الاستراتيجية 🇰🇼
 </h3>
 <p className="text-sm font-bold text-slate-300 text-right mb-4 sm:mb-6 relative z-10">
 توزيع القوة الشرائية وربحية المناطق في الكويت
 </p>

 <div className="w-full relative p-0 sm:p-2" dir="ltr">
 <LeafletKuwaitMap
  markers={leafletMarkers}
  center={displayMapCenter}
  zoom={9}
  dark
  heightClassName="h-[590px] max-h-[72vh] min-h-[520px] sm:h-[620px] sm:max-h-none"
  onMarkerClick={(marker) => setActiveRegion(marker.name)}
 />
 </div>
 <p className="text-[10px] text-slate-500 mt-6 font-bold text-center relative z-10 w-full">الدوائر الذهبية الكبيرة تعني تركيزاً وربحية أعلى للمناطق</p>
 </div>
 );
};

export default GeoHeatmap;
