/**
 * DeliveryHeatMapKuwait projection helper
 * Put this file in:
 *   /src/lib/kuwait-map-projection.js
 *
 * Put SVG in:
 *   /public/maps/kuwait-delivery-map.svg
 *
 * Important:
 * - Keep SVG viewBox 0 0 1000 1000.
 * - Keep the same bbox values below unless you replace the SVG boundary.
 * - invoice.address.region should match an item in kuwaitAreas.
 */

export const KUWAIT_MAP_CONFIG = {
  viewBoxWidth: 1000,
  viewBoxHeight: 1000,
  paddingX: 50,
  paddingY: 97.5,
  lonMin: 46.5687134133,
  lonMax: 48.4160941913,
  latMin: 28.5260627304,
  latMax: 30.0590699326,
  meanLat: 29.2993391205,
};

/**
 * Convert real Kuwait longitude/latitude to SVG x/y.
 * This matches /public/maps/kuwait-delivery-map.svg.
 */
export function lonLatToKuwaitSvgPoint(longitude, latitude) {
  const cfg = KUWAIT_MAP_CONFIG;
  const cosLat = Math.cos((cfg.meanLat * Math.PI) / 180);

  const xMin = cfg.lonMin * cosLat;
  const xMax = cfg.lonMax * cosLat;
  const xVal = longitude * cosLat;

  const usableW = cfg.viewBoxWidth - cfg.paddingX * 2;
  const usableH = cfg.viewBoxHeight - cfg.paddingY * 2;

  const x = cfg.paddingX + ((xVal - xMin) / (xMax - xMin)) * usableW;

  // SVG y grows downward, latitude grows upward.
  const y = cfg.paddingY + ((cfg.latMax - latitude) / (cfg.latMax - cfg.latMin)) * usableH;

  return { x, y };
}

/**
 * Stable jitter so points in the same area do not cover each other.
 * Pass invoice.id or invoice.number as seed.
 */
export function addStableJitter(point, seed = "", radius = 9) {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }

  const angle = (hash % 360) * Math.PI / 180;
  const distance = 2 + (hash % radius);

  return {
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
}

/**
 * Resolve invoice region to an area coordinate.
 * kuwaitAreas format:
 * [
 *   { "region": "السالمية", "lat": 29.3375, "lng": 48.0763 },
 *   { "region": "Salmiya", "lat": 29.3375, "lng": 48.0763 }
 * ]
 */
export function getInvoicePoint(invoice, kuwaitAreas) {
  const region = invoice?.address?.region?.trim();
  if (!region) return null;

  const area = kuwaitAreas.find((item) => {
    return [item.region, item.name, item.name_ar, item.name_en]
      .filter(Boolean)
      .some((name) => String(name).trim() === region);
  });

  if (!area) return null;

  const longitude = Number(area.lng ?? area.lon ?? area.longitude);
  const latitude = Number(area.lat ?? area.latitude);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const basePoint = lonLatToKuwaitSvgPoint(longitude, latitude);
  return addStableJitter(basePoint, invoice.id ?? invoice.number ?? region);
}

/**
 * Example grouping:
 * Use this when you want one bubble per area instead of one dot per invoice.
 */
export function aggregateInvoicesByRegion(invoices = []) {
  const map = new Map();

  for (const invoice of invoices) {
    const region = invoice?.address?.region?.trim();
    if (!region) continue;

    const current = map.get(region) ?? {
      region,
      orders: 0,
      revenue: 0,
    };

    current.orders += 1;
    current.revenue += Number(invoice.total ?? invoice.grandTotal ?? invoice.amount ?? 0);

    map.set(region, current);
  }

  return [...map.values()];
}
