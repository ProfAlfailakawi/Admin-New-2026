import { AppState, Product } from '../types';

export type ProductQualitySignal = {
  id: string;
  title: string;
  text: string;
  count: number;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
  products: Product[];
};

export type ProductQualityReport = {
  score: number;
  status: 'excellent' | 'good' | 'watch' | 'critical';
  title: string;
  summary: string;
  decision: string;
  proof: string;
  action: string;
  opportunity?: ProductQualitySignal;
  risk?: ProductQualitySignal;
  signals: ProductQualitySignal[];
  totalProducts: number;
};

const safeProducts = (data?: AppState): Product[] => Array.isArray(data?.products) ? data!.products : [];
const safeInvoices = (data?: AppState): any[] => Array.isArray(data?.invoices) ? data!.invoices.filter((inv: any) => !inv?.isDeleted) : [];

const hasProductImage = (product: any) => {
  const images = [product?.image, product?.imageUrl, product?.photo, ...(Array.isArray(product?.images) ? product.images : [])].filter(Boolean);
  return images.length > 0;
};

const productSalesMap = (data?: AppState) => {
  const sales: Record<string, number> = {};
  safeInvoices(data).forEach((inv: any) => {
    (inv?.items || []).forEach((item: any) => {
      if (!item?.productId) return;
      sales[item.productId] = (sales[item.productId] || 0) + Number(item.quantity || 0);
    });
  });
  return sales;
};

const marginPct = (product: Product) => {
  const price = Number(product?.price || 0);
  const cost = Number(product?.cost || 0);
  if (!price) return 0;
  return ((price - cost) / price) * 100;
};

const signal = (
  id: string,
  title: string,
  text: string,
  tone: ProductQualitySignal['tone'],
  products: Product[],
): ProductQualitySignal => ({ id, title, text, tone, products, count: products.length });

export function getProductQualityReport(data?: AppState): ProductQualityReport {
  const products = safeProducts(data);
  const sales = productSalesMap(data);
  const totalProducts = products.length;

  const missingVisual = products.filter((p: any) => !hasProductImage(p));
  const weakIdentity = products.filter((p: any) => {
    const name = String(p?.name || '').trim();
    const description = String(p?.description || p?.preparationInstructions || '').trim();
    return name.length > 30 || description.length < 10;
  });
  const dormant = products.filter((p) => (sales[p.id] || 0) === 0 && p.isActive !== false && !p.isOutOfStock);
  const hiddenGems = products
    .filter((p) => marginPct(p) >= 35 && (sales[p.id] || 0) < 5 && p.isActive !== false)
    .sort((a, b) => marginPct(b) - marginPct(a));
  const pricingRisk = products.filter((p) => Number(p?.price || 0) <= Number(p?.cost || 0));

  const signals = [
    signal('missing-visual', 'الواجهة البصرية', 'منتجات تحتاج صورة أو حضور بصري أوضح.', 'amber', missingVisual),
    signal('hidden-gems', 'ذهب مدفون', 'منتجات ربحها قوي لكنها لا تظهر في المبيعات بما يكفي.', 'emerald', hiddenGems),
    signal('weak-identity', 'هوية المنتج', 'منتجات تحتاج اسمًا أهدأ أو وصفًا أقرب لروح التراث.', 'slate', weakIdentity),
    signal('dormant', 'منتجات خاملة', 'منتجات فعالة لكنها لم تتحرك في الفواتير المسجلة.', 'amber', dormant),
    signal('pricing-risk', 'خطر تسعير', 'منتجات سعرها لا يغطي التكلفة حسب البيانات الحالية.', 'rose', pricingRisk),
  ].filter((item) => item.count > 0);

  const penalties = Math.min(45, missingVisual.length * 4)
    + Math.min(25, weakIdentity.length * 2)
    + Math.min(18, dormant.length * 1.2)
    + Math.min(30, pricingRisk.length * 8);
  const score = totalProducts ? Math.max(35, Math.min(100, Math.round(100 - penalties))) : 0;
  const status: ProductQualityReport['status'] = score >= 86 ? 'excellent' : score >= 72 ? 'good' : score >= 55 ? 'watch' : 'critical';

  const risk = pricingRisk.length ? signals.find((s) => s.id === 'pricing-risk') : signals.find((s) => s.id === 'missing-visual') || signals.find((s) => s.id === 'weak-identity');
  const opportunity = signals.find((s) => s.id === 'hidden-gems') || signals.find((s) => s.id === 'dormant');

  const title = status === 'excellent' ? 'المنيو متماسك وفخم'
    : status === 'good' ? 'المنيو جيد ويحتاج لمسة دقيقة'
      : status === 'watch' ? 'المنيو يحتاج ترتيبًا ذكيًا'
        : 'المنيو يحتاج تدخلًا هادئًا الآن';

  const summary = totalProducts
    ? `${totalProducts} منتج تحت المراجعة · ${signals.length ? `${signals.length} إشارات مهمة فقط` : 'لا توجد إشارات مزعجة'}`
    : 'لا توجد منتجات كافية لبناء قراءة جودة.';

  const decision = pricingRisk.length
    ? 'أوقف أي إبراز لمنتجات التسعير الخطر وراجعها قبل التسويق.'
    : hiddenGems.length
      ? `ارفع ظهور "${hiddenGems[0].name}" بدل إطلاق خصم عام.`
      : missingVisual.length
        ? `ابدأ بصورة "${missingVisual[0].name}" لأنها أول فجوة يراها العميل.`
        : dormant.length
          ? `جرّب إبراز "${dormant[0].name}" داخل مناسبة واضحة.`
          : 'لا تضف زحمة؛ حافظ على الهدوء وراقب الحركة القادمة.';

  const proof = pricingRisk.length
    ? `${pricingRisk.length} منتج يحتاج مراجعة سعرية.`
    : hiddenGems.length
      ? `${hiddenGems.length} منتج بهامش قوي ومبيعات منخفضة.`
      : missingVisual.length
        ? `${missingVisual.length} منتج بلا صورة أو حضور بصري كافٍ.`
        : dormant.length
          ? `${dormant.length} منتج فعّال بلا حركة بيع مسجلة.`
          : 'المؤشرات الحالية لا تطلب تدخلًا كبيرًا.';

  const action = pricingRisk.length
    ? 'راجع السعر والتكلفة فقط؛ لا تغيّر الدفع ولا الفواتير.'
    : hiddenGems.length
      ? 'انقله للأعلى، اربطه بمناسبة، أو اجعله اختيارًا مقترحًا.'
      : missingVisual.length
        ? 'أضف صورة نظيفة ووصفًا قصيرًا قبل أي حملة.'
        : 'استخدم وضع التركيز: فرصة واحدة، خطر واحد، وقرار واحد.';

  return { score, status, title, summary, decision, proof, action, opportunity, risk, signals, totalProducts };
}
