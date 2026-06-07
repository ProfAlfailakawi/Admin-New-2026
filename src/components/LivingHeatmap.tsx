import kuwaitAreas from "../data/kuwait-areas.json";
import {
  getInvoicePoint,
  lonLatToKuwaitSvgPoint,
  aggregateInvoicesByRegion,
} from "../lib/kuwait-map-projection";

/**
 * Minimal React example.
 * SVG file path:
 *   /public/maps/kuwait-delivery-map.svg
 */
export default function LivingHeatmap({ invoices = [] }: { invoices?: any[] }) {
  const regionStats = aggregateInvoicesByRegion(invoices);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <img
        src="/maps/kuwait-delivery-map.svg"
        alt="خريطة نبض الطلبات في الكويت"
        className="w-full rounded-[28px] shadow-sm border border-slate-200"
      />

      {/* Overlay uses same 1000x1000 viewBox as the SVG. */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
      >
        {regionStats.map((stat) => {
          const area: any = kuwaitAreas.find((item: any) =>
            [item.region, item.name, item.name_ar, item.name_en]
              .filter(Boolean)
              .some((name) => String(name).trim() === stat.region)
          );

          if (!area) return null;

          const longitude = Number(area.lng ?? area.lon ?? area.longitude);
          const latitude = Number(area.lat ?? area.latitude);
          const { x, y } = lonLatToKuwaitSvgPoint(longitude, latitude);

          const radius = Math.max(7, Math.min(34, 7 + Math.sqrt(stat.orders) * 4));

          return (
            <g key={stat.region}>
              <circle cx={x} cy={y} r={radius + 8} fill="#FFB03A" opacity="0.13" />
              <circle cx={x} cy={y} r={radius} fill="#FFB03A" opacity="0.82" />
              <circle cx={x} cy={y} r="4" fill="#FFFFFF" opacity="0.92" />
              <title>{`${stat.region} — ${stat.orders} طلب — ${stat.revenue.toFixed(3)} KD`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
