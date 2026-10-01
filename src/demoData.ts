/**
 * Rich, deterministic, fully fictitious demo dataset (presentation / demo mode only).
 *
 * - Every date is relative to "now", so charts always show the most recent ~6 months.
 * - A seeded PRNG keeps the numbers identical between reloads.
 * - Cross-entity links are consistent: invoices -> customers/products/suppliers,
 *   orders -> invoices, transfers -> suppliers, testimonials -> invoices.
 * - Nothing here touches Firebase or any server; it only builds an in-memory AppState.
 */
import { demoReelArchive } from './lib/demoAi';
import type {
  AppState, Customer, Expense, Invoice, InvoiceItem, Order, PaymentMethod, Product,
  PromoCode, Supplier, SupplierTransfer, Testimonial, Notification, Squad, Zone,
} from './types';
import { recalculateStateBalances } from './lib/business-logic';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Self-contained "food photo" style picture (no network, never broken): warm table background with
 * soft light, bokeh, a plate with rim and shadow, the dish emoji and a few garnish dots.
 * `label` is only used as the accessible title and (for archive cards) as a caption.
 */
function productImage(label: string, hue: number, emoji: string, caption = false): string {
  const safe = label.replace(/[<>&"]/g, '');
  const h2 = (hue + 28) % 360;
  const dots = [[96, 70, 9], [310, 92, 7], [84, 232, 6], [330, 214, 10], [60, 150, 5], [352, 150, 6]]
    .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${(hue + 120 + i * 20) % 360},55%,55%)" fill-opacity=".55"/>`).join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><title>${safe}</title>` +
    `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},38%,30%)"/><stop offset="1" stop-color="hsl(${h2},45%,14%)"/></linearGradient>` +
    `<radialGradient id="l" cx=".28" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="p" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e2d6"/></radialGradient></defs>` +
    `<rect width="400" height="300" fill="url(#t)"/>` +
    `<g stroke="#fff" stroke-opacity=".05" stroke-width="2">${[40, 80, 120, 160, 200, 240, 280].map(y => `<path d="M0 ${y} Q200 ${y + 14} 400 ${y}" fill="none"/>`).join('')}</g>` +
    `<rect width="400" height="300" fill="url(#l)"/>` +
    `<circle cx="338" cy="44" r="70" fill="#fff" fill-opacity=".06"/><circle cx="52" cy="262" r="48" fill="#fff" fill-opacity=".05"/>` +
    `<ellipse cx="200" cy="196" rx="132" ry="26" fill="#000" fill-opacity=".35"/>` +
    `<circle cx="200" cy="140" r="112" fill="url(#p)"/><circle cx="200" cy="140" r="112" fill="none" stroke="hsl(${hue},45%,62%)" stroke-opacity=".7" stroke-width="3"/>` +
    `<circle cx="200" cy="140" r="84" fill="hsl(${hue},30%,96%)" stroke="#d8cfbf" stroke-width="1.5"/>` +
    dots +
    `<text x="200" y="146" font-size="104" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` +
    (caption ? `<rect x="0" y="252" width="400" height="48" fill="#000" fill-opacity=".38"/><text x="200" y="283" font-size="22" fill="#fff" text-anchor="middle" font-family="sans-serif">${safe}</text>` : '') +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DAY = 86400000;

export function buildDemoState(base: {
  zones: Zone[];
  squadTiers: any[];
  diwaniyaTiers: any[];
  categories: string[];
}): AppState {
  const rnd = mulberry32(20261001);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const now = new Date();
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now.getTime() - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() > now.getTime()) d.setTime(now.getTime() - 60000 * (5 + ((hour * 13 + minute * 7 + daysAgo * 3) % 86))); // no rnd() here: keeps the sequence identical whatever the time of day
    return d;
  };

  // ---------------------------------------------------------------- suppliers
  const suppliers: Supplier[] = [
    { id: 's1', name: 'مزارع الدواجن الذهبية', phone: '55501001', paymentMethods: ['BankTransfer', 'KNet'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's2', name: 'مسلخ الأنعام الوطني', phone: '55501002', paymentMethods: ['BankTransfer'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's3', name: 'أسماك الخليج الطازجة', phone: '55501003', paymentMethods: ['KNet', 'Cash'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's4', name: 'مخابز ومطاحن السنابل', phone: '55501004', paymentMethods: ['BankTransfer', 'Link'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's5', name: 'سوق الخضار المركزي (تجريبي)', phone: '55501005', paymentMethods: ['Cash', 'BankTransfer'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's6', name: 'ألبان وعصائر المروج', phone: '55501006', paymentMethods: ['Link', 'BankTransfer'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's7', name: 'حلويات الديوان الشرقي', phone: '55501007', paymentMethods: ['KNet', 'BankTransfer'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's9', name: 'مصنع الوجبات الجاهزة للشركات', phone: '55501009', paymentMethods: ['BankTransfer', 'Link'], balance: 0, status: 'paid', supplierType: 'food' },
    { id: 's8', name: 'شركة السرعة للتوصيل', phone: '55501008', paymentMethods: ['BankTransfer'], balance: 0, status: 'paid', supplierType: 'delivery', deliverySettlement: 'delivery_company' },
  ];

  // ----------------------------------------------------------------- products
  type P = [string, string, number, number, string, string, number, string, 'star' | 'puzzle' | 'horse' | 'dog', number];
  const productRows: P[] = [
    ['p1', 'مجبوس دجاج عائلي', 3.5, 12.5, 'الدجاج', 's1', 20, '🍗', 'star', 40],
    ['p2', 'برياني دجاج ديلوكس', 2.8, 9.5, 'الدجاج', 's1', 40, '🍛', 'star', 60],
    ['p3', 'دجاج مشوي بالفرن (حبة كاملة)', 2.2, 5.75, 'الدجاج', 's1', 15, '🍖', 'horse', 35],
    ['p4', 'مطبق زبيدي بلاتيني', 7, 24.5, 'الولائم', 's2', 22, '🐟', 'star', 25],
    ['p5', 'وليمة غنم نعيمي (VIP)', 8.5, 28, 'الولائم', 's2', 35, '🍖', 'star', 18],
    ['p6', 'قوزي لحم حاشي', 11, 36, 'الولائم', 's2', 130, '🥘', 'puzzle', 12],
    ['p7', 'مندي لحم غنم', 6.2, 19.5, 'اللحوم', 's2', 200, '🍲', 'star', 30],
    ['p8', 'كباب لحم مشكل (كيلو)', 3.4, 8.9, 'المشويات', 's2', 15, '🍢', 'horse', 50],
    ['p9', 'شيش طاووق (٦ أسياخ)', 1.9, 5.5, 'المشويات', 's1', 25, '🍢', 'horse', 70],
    ['p10', 'ريش غنم مشوية', 5.1, 15.5, 'المشويات', 's2', 5, '🥩', 'puzzle', 20],
    ['p11', 'سمك صافي مشوي', 4.2, 13.5, 'البحري', 's3', 180, '🐠', 'star', 28],
    ['p12', 'ربيان مقلي بالثوم', 3, 8.5, 'البحري', 's3', 190, '🦐', 'puzzle', 32],
    ['p13', 'صينية مكبوس ربيان', 6.8, 21, 'البحري', 's3', 160, '🦐', 'puzzle', 14],
    ['p14', 'جريش لحم ناطع', 2.5, 6.5, 'اللحوم', 's4', 45, '🥣', 'horse', 45],
    ['p15', 'هريس تراثي', 2.3, 6.25, 'اللحوم', 's4', 300, '🥣', 'horse', 22],
    ['p16', 'سمبوسة جبن (٢٠ حبة)', 1.1, 3.75, 'المقبلات', 's4', 35, '🥟', 'star', 90],
    ['p17', 'سلطة تبولة كويتية', 0.8, 2.25, 'المقبلات', 's5', 10, '🥗', 'horse', 80],
    ['p18', 'حمص بطحينة', 0.6, 1.75, 'المقبلات', 's5', 12, '🧆', 'dog', 75],
    ['p19', 'شوربة عدس التراث', 0.5, 1.25, 'المقبلات', 's5', 18, '🍵', 'dog', 8],
    ['p20', 'تمن أحمر بالكرنب', 1.1, 3.25, 'المقبلات', 's4', 30, '🍚', 'horse', 55],
    ['p21', 'لبن بالنعناع المبرد', 0.25, 1.5, 'المشروبات', 's6', 150, '🥛', 'horse', 120],
    ['p22', 'عصير ليمون بالنعناع (لتر)', 0.45, 2.25, 'المشروبات', 's6', 90, '🍋', 'star', 100],
    ['p23', 'قهوة عربية مع تمر (دلة)', 0.9, 4.5, 'المشروبات', 's6', 160, '☕', 'star', 40],
    ['p24', 'لقيمات بالدبس', 0.4, 2.25, 'حلويات', 's7', 35, '🍩', 'star', 65],
    ['p25', 'خبيصة كويتية', 0.7, 2.75, 'حلويات', 's7', 40, '🍮', 'puzzle', 25],
    ['p26', 'كنافة بالجبن (صينية)', 2.4, 7.9, 'حلويات', 's7', 20, '🍰', 'horse', 30],
    ['p27', 'صندوق غداء الموظفين (عرض الشركات)', 5.4, 7.5, 'الدجاج', 's9', 210, '🍱', 'horse', 90],
  ];
  const products: Product[] = productRows.map(([id, name, cost, price, category, supplierId, hue, emoji, matrix, stock], i) => ({
    id, name, cost: r3(cost * 1.3), price, category, supplierId,
    matrixCategory: matrix,
    imageUrl: productImage(name.split(' ').slice(0, 2).join(' '), hue, emoji),
    isActive: true,
    isOutOfStock: id === 'p10' || id === 'p19' ? stock < 10 : false,
    stock,
    minOrderQty: category === 'الولائم' ? 1 : 1,
    description: `${name} - تحضير طازج يومياً من مطبخ التراث الكويتي بوصفة تقليدية.`,
    calories: 220 + ((i * 47) % 480),
    isMenuFeatured: ['star'].includes(matrix) && i % 2 === 0,
    featuredRank: matrix === 'star' && i % 2 === 0 ? i + 1 : undefined,
    createdAt: at(200 + i, 10).toISOString(),
    lastSaleDate: at(int(0, 6), 14).toISOString(),
    preparationInstructions: 'يُسخَّن في الفرن لمدة ١٠ دقائق على ١٨٠ درجة قبل التقديم.',
  }));
  const productById = new Map(products.map(p => [p.id, p]));
  // weighted popularity: stars sell most
  const weighted: Product[] = [];
  const rareIds = new Set(['p6', 'p10']); // high-margin but rarely ordered ("hidden gems")
  products.forEach(p => {
    if (rareIds.has(p.id)) return;
    const w = p.id === 'p27' ? 14 : p.matrixCategory === 'star' ? 5 : p.matrixCategory === 'horse' ? 4 : p.matrixCategory === 'puzzle' ? 2 : 1;
    for (let k = 0; k < w; k++) weighted.push(p);
  });

  // ---------------------------------------------------------------- customers
  const first = ['خالد', 'سارة', 'محمد', 'نورة', 'يوسف', 'مريم', 'عبدالرحمن', 'فاطمة', 'عبدالله', 'لولوة', 'علي', 'فهد', 'جاسم', 'هنادي', 'سعد', 'منى', 'بدر', 'دلال', 'فيصل', 'شهد', 'منصور', 'ليلى', 'مشعل', 'ريم', 'سعود', 'إيمان', 'نايف', 'لطيفة', 'ياسر', 'حصة'];
  const family = ['المطيري', 'الكندري', 'العجمي', 'العتيبي', 'الدوسري', 'الشمري', 'الظفيري', 'الرشيدي', 'العنزي', 'الخالد', 'الغانم', 'الفليج', 'الملا', 'العيسى', 'القلاف', 'الشطي', 'السالم', 'الصراف', 'المرزوق', 'الصالح'];
  const companies = ['ديوانية الهاشم', 'مجموعة الضيافة الكبرى', 'شركة النقل الوطنية', 'مكتب الرؤية للاستشارات', 'مؤسسة الواحة العقارية', 'مدرسة النخبة الأهلية', 'مستشفى الشفاء الأهلي', 'نادي الفروسية الشبابي'];
  const areaList = ['السالمية', 'حولي', 'الجابرية', 'الفروانية', 'الشويخ', 'الرميثية', 'مشرف', 'صباح السالم', 'الفحيحيل', 'الجهراء', 'خيطان', 'الدسمة', 'كيفان', 'العديلية', 'سلوى', 'اليرموك', 'الري', 'القادسية'];
  const customers: Customer[] = Array.from({ length: 64 }, (_, i) => {
    const isCompany = i % 8 === 0;
    const name = isCompany ? companies[(i / 8) % companies.length] : `${first[i % first.length]} ${family[(i * 7 + 3 + Math.floor(i / 30)) % family.length]}`;
    const area = areaList[(i * 5) % areaList.length];
    return {
      id: `c${i + 1}`,
      name,
      phone: `5550${String(2000 + i * 13).padStart(4, '0')}`,
      email: i % 3 === 0 ? `customer${i + 1}@example.com` : undefined,
      status: 'active',
      totalOrders: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      sentiment: i % 7 === 0 ? 'neutral' : i % 11 === 0 ? 'negative' : 'positive',
      area,
      address: { region: area, block: String(1 + (i % 9)), street: String(3 + (i % 20)), jaddah: String(1 + (i % 4)), building: String(1 + ((i * 3) % 60)), floor: String(1 + (i % 4)), apartment: String(1 + (i % 12)) },
    };
  });
  const diwaniyaNames = ['ديوانية الفيلكاوي', 'ديوانية الصقور', 'ديوانية أبناء الديرة', 'ديوانية النخبة', 'ديوانية الشباب الأصيل', 'ديوانية الوفاء'];
  customers.forEach((c, i) => {
    if (i < 18) { c.diwaniyaName = diwaniyaNames[i % diwaniyaNames.length]; }
  });

  // ----------------------------------------------------------------- invoices
  const promoDefs: PromoCode[] = [
    { id: 'promo1', code: 'TURATH10', discountType: 'percentage', discountValue: 10, startDate: at(120, 8).toISOString(), endDate: at(-90, 8).toISOString(), usageLimit: 300, usedCount: 0, isActive: true },
    { id: 'promo2', code: 'RAMADAN25', discountType: 'percentage', discountValue: 25, startDate: at(210, 8).toISOString(), endDate: at(150, 8).toISOString(), usageLimit: 150, usedCount: 0, isActive: false },
    { id: 'promo3', code: 'WELCOME2', discountType: 'fixed', discountValue: 2, startDate: at(200, 8).toISOString(), endDate: at(-120, 8).toISOString(), usageLimit: 500, usedCount: 0, isActive: true },
    { id: 'promo4', code: 'DIWANIYA5', discountType: 'fixed', discountValue: 5, startDate: at(60, 8).toISOString(), endDate: at(-30, 8).toISOString(), usageLimit: 80, usedCount: 0, isActive: true },
    { id: 'promo5', code: 'NATIONALDAY', discountType: 'percentage', discountValue: 15, startDate: at(220, 8).toISOString(), endDate: at(170, 8).toISOString(), usageLimit: 200, usedCount: 0, isActive: false },
    { id: 'promo6', code: 'FRIDAYFEAST', discountType: 'percentage', discountValue: 12, startDate: at(30, 8).toISOString(), endDate: at(-60, 8).toISOString(), usageLimit: 120, usedCount: 0, isActive: true },
  ];

  const deliveryCompany = { company: 'شركة السرعة للتوصيل', settlementTarget: 'delivery_company' as const, settlementSupplierId: 's8', settlementSupplierName: 'شركة السرعة للتوصيل' };
  const zones = base.zones;
  const zoneForArea = (area: string) => zones.find(z => z.name === area) || zones[0];

  // Supplier price creep: older invoices were costed lower, so the negotiation/risk engines have a real trend.
  const costDrift: Record<string, number> = { p5: 0.32, p13: 0.28, p4: 0.27, p11: 0.18, p1: 0.13, p7: 0.15, p12: 0.12 };
  const makeItems = (when: Date = now): InvoiceItem[] => {
    const ageRatio = Math.max(0, Math.min(1, (now.getTime() - when.getTime()) / (190 * DAY)));
    const n = int(1, 4);
    const seen = new Set<string>();
    const items: InvoiceItem[] = [];
    for (let k = 0; k < n; k++) {
      const roll = rnd();
      const p = roll < 0.0018 ? productById.get('p6')! : roll < 0.0036 ? productById.get('p10')! : pick(weighted);
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const qty = p.price > 20 ? int(1, 2) : int(1, 4);
      items.push({ productId: p.id, name: p.name, productName: p.name, quantity: qty, priceAtTime: p.price, costAtTime: r3(p.cost / (1 + (costDrift[p.id] || 0) * ageRatio)) });
    }
    return items;
  };

  const invoices: Invoice[] = [];
  const orders: Order[] = [];
  const payMethods: PaymentMethod[] = ['KNet', 'KNet', 'KNet', 'Link', 'Link', 'Cash', 'BankTransfer'];
  let invSeq = 5000;

  const makeInvoice = (date: Date, customer: Customer, opts: { id?: string; items?: InvoiceItem[]; status?: string; paymentStatus?: string; method?: PaymentMethod } = {}): Invoice => {
    const items = opts.items || makeItems(date);
    const subtotal = items.reduce((s, it) => s + it.priceAtTime * it.quantity, 0);
    const totalCost = items.reduce((s, it) => s + it.costAtTime * it.quantity, 0);
    const zone = zoneForArea(customer.area || 'السالمية');
    const useCompany = rnd() < 0.55;
    const deliveryType = subtotal > 60 ? 'free' : useCompany ? 'company' : 'standard';
    const deliveryFee = deliveryType === 'free' ? 0 : useCompany ? 2.5 : 1.5;
    const deliveryCost = deliveryType === 'free' ? 1.75 : useCompany ? 1.75 : 1;
    let discount = 0;
    let promoName: string | undefined;
    const monthsAgo = (now.getTime() - date.getTime()) / DAY;
    if (rnd() < 0.16) {
      const eligible = promoDefs.filter(p => new Date(p.startDate) <= date && new Date(p.endDate) >= date);
      if (eligible.length) {
        const promo = pick(eligible);
        discount = promo.discountType === 'percentage' ? r3(subtotal * promo.discountValue / 100) : Math.min(promo.discountValue, subtotal);
        promoName = promo.code;
        promo.usedCount += 1;
      }
    }
    const method = opts.method || pick(payMethods);
    const gatewayFee = method === 'Cash' || method === 'BankTransfer' ? 0 : 0.2;
    const totalAmount = r3(subtotal + deliveryFee - discount);
    const profit = r3(totalAmount - totalCost - deliveryCost - gatewayFee);
    const id = opts.id || `INV-${invSeq++}`;
    const paymentStatus = opts.paymentStatus || 'paid';
    void monthsAgo;
    return {
      id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      area: customer.area,
      address: customer.address,
      items,
      deliveryFee,
      deliveryType: deliveryType as any,
      deliveryInfo: { company: useCompany ? deliveryCompany.company : 'توصيل المطبخ', zoneName: zone.name, cost: deliveryCost, profit: r3(deliveryFee - deliveryCost), finalPrice: deliveryFee, ...(useCompany ? { settlementTarget: deliveryCompany.settlementTarget, settlementSupplierId: deliveryCompany.settlementSupplierId, settlementSupplierName: deliveryCompany.settlementSupplierName } : { settlementTarget: 'heritage' as const }) },
      gatewayFee,
      paymentMethod: method,
      date: date.toISOString(),
      deliveryDate: date.toISOString().slice(0, 10),
      deliveryTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      totalAmount,
      totalCost: r3(totalCost),
      profit,
      discount,
      isDeleted: false,
      appliedPromoCodeName: promoName,
      paymentStatus,
      status: opts.status || (paymentStatus === 'paid' ? 'paid' : 'pending'),
      deliverySettlementTarget: useCompany ? 'delivery_company' : 'heritage',
      deliverySettlementSupplierId: useCompany ? 's8' : undefined,
      notes: rnd() < 0.12 ? pick(['بدون بصل', 'التوصيل بعد الساعة ٨ مساءً', 'تغليف هدية', 'إضافة ملاعق وصحون', 'الطابق الثالث - الجرس معطل']) : undefined,
    } as Invoice;
  };

  // 560 POS invoices over ~190 days, denser and larger toward the present (growth trend).
  const lapsedIds = new Set(['c2', 'c3', 'c5', 'c9', 'c12', 'c15']);
  const TOTAL_INV = 560;
  for (let i = 0; i < TOTAL_INV; i++) {
    const r = rnd();
    const daysAgo = i < 7 ? 0 : i < 15 ? 1 : Math.floor(Math.pow(r, 1.5) * 190);
    const dow = new Date(now.getTime() - daysAgo * DAY).getDay();
    // weekends (Thu/Fri) are the busiest in Kuwait
    if ((dow === 4 || dow === 5) === false && rnd() < 0.18) { i--; continue; }
    const hour = pick([11, 12, 13, 13, 14, 15, 17, 18, 19, 19, 20, 20, 21, 22]);
    let customer = customers[Math.floor(Math.pow(rnd(), 1.6) * customers.length)];
    // a handful of big spenders stopped ordering 5-9 weeks ago (VIP churn / win-back stories)
    if (lapsedIds.has(customer.id) && daysAgo < 36) customer = customers[(Number(customer.id.slice(1)) + 20) % customers.length];
    const date = at(daysAgo, hour, int(0, 59));
    const roll = rnd();
    const pending = daysAgo <= 2 && roll < 0.16;
    invoices.push(makeInvoice(date, customer, pending ? { paymentStatus: 'pending', status: 'بانتظار الدفع' } : {}));
  }

  // ----------------------------------------------------- website orders (ORD-)
  const orderStatuses: Array<[string, string, number]> = [
    // [status, paymentStatus, count]
    ['pending', 'pending', 6],
    ['split_pending', 'split_pending', 3],
    ['paid', 'paid', 16],
    ['processed', 'paid', 6],
    ['delivered', 'paid', 18],
    ['cancelled', 'cancelled', 5],
    ['failed', 'failed', 3],
  ];
  let ordSeq = 8100;
  orderStatuses.forEach(([status, paymentStatus, count]) => {
    for (let k = 0; k < count; k++) {
      const recent = ['pending', 'split_pending', 'paid', 'failed'].includes(status);
      const daysAgo = recent ? int(0, 2) : int(1, 60);
      let customer = customers[int(0, customers.length - 1)];
      if (lapsedIds.has(customer.id)) customer = customers[(Number(customer.id.slice(1)) + 7) % customers.length];
      const date = at(daysAgo, pick([10, 12, 14, 16, 18, 20, 21]), int(0, 59));
      const items = makeItems(date);
      const id = `ORD-${ordSeq++}`;
      let linkedInvoiceId: string | undefined;
      let total: number;
      let delivery = 1.5;
      if (paymentStatus === 'paid') {
        const inv = makeInvoice(date, customer, { items, id: `INV-${invSeq++}`, method: 'KNet' });
        (inv as any).orderId = id;
        invoices.push(inv);
        linkedInvoiceId = inv.id;
        total = inv.totalAmount;
        delivery = inv.deliveryFee;
      } else {
        const sub = items.reduce((s, it) => s + it.priceAtTime * it.quantity, 0);
        total = r3(sub + delivery);
      }
      const z = zoneForArea(customer.area || 'السالمية');
      const addr = customer.address as any;
      orders.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        regionId: z.id,
        items,
        totalAmount: total,
        status,
        date: date.toISOString(),
        updatedAt: date.toISOString(),
        deliveryDate: date.toISOString().slice(0, 10),
        deliveryTime: `${int(12, 21)}:00`,
        deliveryType: 'standard',
        paymentStatus,
        paymentId: `PAY-${100000 + ordSeq}`,
        trackId: `TRK-${200000 + ordSeq}`,
        isConvertedToInvoice: Boolean(linkedInvoiceId),
        linkedInvoiceId,
        area: customer.area,
        address: customer.address,
        block: addr.block,
        street: addr.street,
        house: addr.building,
        floor: addr.floor,
        apartment: addr.apartment,
        fullAddress: `${customer.area}، قطعة ${addr.block}، شارع ${addr.street}، منزل ${addr.building}`,
        notes: k % 4 === 0 ? 'يرجى الاتصال قبل الوصول' : undefined,
        ...(status === 'split_pending' ? (() => {
          const names = ['ديوانية الفيلكاوي', 'ديوانية الصقور', 'ديوانية أبناء الديرة'];
          const members = [customer, ...customers.filter(c => c.diwaniyaName).slice(k * 3, k * 3 + 3)].slice(0, 4);
          const share = r3(total / members.length);
          return {
            squadName: names[k % names.length],
            splitPayments: members.map((m, mi) => ({ name: m.name, phone: m.phone, amount: share, status: mi === 0 ? 'paid' : 'pending', paymentStatus: mi === 0 ? 'paid' : 'pending', paid: mi === 0 })),
          };
        })() : {}),
      } as Order);
    }
  });
  invoices.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  orders.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // ------------------------------------------------ customers stats from sales
  const paidInv = invoices.filter(i => i.paymentStatus === 'paid');
  customers.forEach(c => {
    const mine = paidInv.filter(i => i.customerId === c.id);
    c.totalOrders = mine.length;
    c.totalSpent = r3(mine.reduce((s, i) => s + i.totalAmount, 0));
    const last = mine[0];
    c.lastOrderDate = last?.date;
    c.lastActive = last?.date;
    const since = last ? (now.getTime() - +new Date(last.date)) / DAY : 999;
    c.status = since <= 30 ? 'active' : since <= 75 ? 'slow' : 'inactive';
    c.loyaltyPoints = Math.floor(c.totalSpent * 10);
    if (c.diwaniyaName) c.diwaniyaPoints = Math.floor(c.totalSpent * 8);
  });

  // ---------------------------------------------------------------- expenses
  const expenses: Expense[] = [];
  let expSeq = 1;
  const addExp = (daysAgo: number, description: string, category: string, amount: number, method: PaymentMethod = 'BankTransfer') => {
    const d = at(daysAgo, 11, int(0, 59));
    expenses.push({ id: `exp-${expSeq++}`, description, category, amount, paymentMethod: method, date: d.toISOString(), createdAt: d.toISOString() });
  };
  for (let m = 0; m < 6; m++) {
    const base = m * 30 + 3;
    addExp(base + 1, 'إيجار المطبخ المركزي', 'أجور وإيجارات', 850);
    addExp(base + 2, 'رواتب الطهاة وفريق التحضير', 'أجور وإيجارات', 1200 + (5 - m) * 20);
    addExp(base + 4, 'رواتب فريق التوصيل', 'أجور وإيجارات', 640);
    addExp(base + 7, 'فاتورة الكهرباء والماء', 'مصروفات تشغيلية', 95 + (m % 3) * 12, 'KNet');
    addExp(base + 9, 'حملة إعلانات انستغرام وسناب', 'تسويق وإعلانات', 180 + m * 15, 'KNet');
    addExp(base + 12, 'مواد تغليف وعلب حرارية', 'تغليف ومستلزمات', 110 + (m % 4) * 18, 'Cash');
    addExp(base + 15, 'وقود سيارات التوصيل', 'مصروفات تشغيلية', 70 + (m % 2) * 15, 'Cash');
    addExp(base + 18, 'اشتراك منصة الطلبات والدفع الإلكتروني', 'رسوم بوابات الدفع', 45, 'KNet');
    addExp(base + 21, 'صيانة الأفران والثلاجات', 'صيانة وتقنية', 60 + (m % 3) * 40, 'Cash');
    addExp(base + 24, 'تجديد التراخيص والرسوم الحكومية', 'رسوم حكومية', m % 2 ? 35 : 120);
  }
  expenses.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // ------------------------------------------------ supplier transfers (ledger)
  // Pay each supplier for completed months; leave the most recent weeks open so balances are > 0.
  const supplierOwedByMonth = new Map<string, number[]>();
  paidInv.forEach(inv => {
    const mAgo = Math.floor((now.getTime() - +new Date(inv.date)) / (30 * DAY));
    inv.items.forEach(it => {
      const sid = productById.get(it.productId)?.supplierId;
      if (!sid) return;
      const arr = supplierOwedByMonth.get(sid) || [0, 0, 0, 0, 0, 0, 0];
      arr[Math.min(mAgo, 6)] += it.costAtTime * it.quantity;
      supplierOwedByMonth.set(sid, arr);
    });
    const dsid = inv.deliverySettlementSupplierId;
    if (dsid) {
      const arr = supplierOwedByMonth.get(dsid) || [0, 0, 0, 0, 0, 0, 0];
      arr[Math.min(mAgo, 6)] += inv.deliveryInfo?.cost || 0;
      supplierOwedByMonth.set(dsid, arr);
    }
  });
  const supplierTransfers: SupplierTransfer[] = [];
  let trSeq = 1;
  suppliers.forEach((s, si) => {
    const arr = supplierOwedByMonth.get(s.id) || [];
    const settledToday = s.id === 's5' || s.id === 's6' || s.id === 's7'; // small suppliers paid up to yesterday
    for (let m = settledToday ? 0 : 1; m < arr.length; m++) {
      if (!arr[m]) continue;
      const portion = m === 0 ? 1 : m === 1 ? (settledToday ? 1 : si % 3 === 0 ? 0.5 : 0.8) : 1;
      const method = s.paymentMethods[m % s.paymentMethods.length];
      supplierTransfers.push({
        id: `t-${trSeq++}`,
        supplierId: s.id,
        amount: r3(arr[m] * portion),
        remainingAmount: 0,
        method,
        date: (m === 0 ? at(1, 12, 30) : at(m * 30 - 12, 12, 30)).toISOString(),
        notes: m === 0 ? 'تسوية الرصيد الجاري' : `سداد مستحقات شهر ${m} ${m === 1 && portion < 1 ? '(دفعة جزئية)' : 'كاملة'}`,
      });
    }
  });
  supplierTransfers.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // ------------------------------------------------------------- testimonials
  const comments: [string, string, number][] = [
    ['تجربة فريدة مع مطبخ التراث! المجبوس طعمه كويتي أصيل والتغليف ممتاز.', 'Instagram', 5],
    ['خدمة التموين لعزيمة العائلة كانت متميزة، بيضوا وجهنا قدام الضيوف.', 'WhatsApp', 5],
    ['التوصيل سريع والطلب وصل مرتب وساخن، بس أتمنى زيادة كمية الرز شوي.', 'Direct', 4],
    ['الوليمة وايد لذيذة واللحم طري، أكيد بنعيد الطلب في المناسبة الجاية.', 'WhatsApp', 5],
    ['المطبق الزبيدي رهيب! بس التوصيل تأخر ٢٠ دقيقة عن الموعد.', 'Instagram', 4],
    ['أسعار معقولة مقارنة بالجودة، والمقبلات كانت طازجة.', 'Direct', 4],
    ['الجريش كان ناطع وطعمه مثل أيام زمان، شكراً لكم.', 'WhatsApp', 5],
    ['الطلب وصل ناقص صنف واحد، لكن الفريق عوضنا بسرعة وهذا يستحق التقدير.', 'WhatsApp', 3],
    ['القهوة العربية مع التمر لمسة حلوة للديوانية، الله يعطيكم العافية.', 'Instagram', 5],
    ['السمك مشوي زين والتتبيلة مضبوطة، بس يحتاج ليمون أكثر.', 'Direct', 4],
    ['خدمة العملاء راقية وردوا علي خلال دقائق على الواتساب.', 'WhatsApp', 5],
    ['التغليف حلو بس العلبة انسكب منها شوي مرق.', 'Instagram', 3],
  ];
  const testimonials: Testimonial[] = comments.map(([content, source, rating], i) => {
    const inv = paidInv[(i * 17) % paidInv.length];
    return { id: `t${i + 1}`, customerName: inv.customerName, content, date: at(i * 6 + 1, 16).toISOString(), source: source as any, rating, invoiceId: inv.id };
  });

  // --------------------------------------------------------------- notifications
  const topCustomer = [...customers].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  const lostCustomer = customers.find(c => c.status === 'inactive') || customers[customers.length - 1];
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const notifications: Notification[] = [
    { id: 'n1', title: 'عميل VIP يحتاج مكافأة', message: `العميل "${topCustomer.name}" حقق أعلى قيمة مشتريات (${topCustomer.totalSpent.toFixed(3)} د.ك). يُنصح بإرسال عرض خاص.`, type: 'warning', read: false, date: at(0, 9).toISOString(), insightType: 'فرصة', explanation: 'أعلى إنفاق تراكمي بين العملاء النشطين.', dataReference: topCustomer.id, recommendedAction: 'إرسال كود خصم ٥ د.ك عبر واتساب' },
    { id: 'n2', title: 'تحقق هدف المبيعات اليومي', message: 'تم الوصول لهدف المبيعات اليومي. ما شاء الله!', type: 'success', read: false, date: at(0, 8).toISOString() },
    { id: 'n3', title: 'عميل مفقود', message: `العميل "${lostCustomer.name}" لم يطلب منذ أكثر من ٧٥ يوماً. تواصل معه.`, type: 'info', read: false, date: at(1, 18).toISOString(), insightType: 'تنبيه', recommendedAction: 'رسالة استرجاع مع خصم ١٠٪' },
    { id: 'n4', title: 'طلبات بانتظار الدفع', message: `لديك ${pendingCount} طلبات موقع بانتظار إتمام الدفع منذ أكثر من ساعة.`, type: 'warning', read: false, date: at(0, 7).toISOString(), insightType: 'تنبيه' },
    { id: 'n5', title: 'مستحقات مورد', message: `رصيد المورد "${suppliers[1].name}" مستحق السداد خلال يومين.`, type: 'warning', read: true, date: at(2, 12).toISOString(), insightType: 'خطر' },
    { id: 'n6', title: 'منتج الأعلى ربحية', message: 'وليمة غنم نعيمي (VIP) هي الأعلى هامش ربح هذا الشهر. ركز عليها في الحملات.', type: 'info', read: true, date: at(3, 10).toISOString(), insightType: 'فرصة' },
    { id: 'n7', title: 'مخزون منخفض', message: 'ريش غنم مشوية و شوربة عدس التراث أوشكت على النفاد.', type: 'warning', read: false, date: at(1, 9).toISOString(), insightType: 'خطر' },
    { id: 'n8', title: 'تقييم جديد ٥ نجوم', message: 'عميل جديد ترك تقييماً ممتازاً على إنستغرام.', type: 'success', read: true, date: at(4, 20).toISOString() },
    { id: 'n9', title: 'تقرير الأسبوع جاهز', message: 'ملخص أداء الأسبوع الماضي متاح الآن في التقارير التنفيذية.', type: 'info', read: true, date: at(6, 9).toISOString() },
    { id: 'n10', title: 'كود خصم يقترب من الانتهاء', message: 'كود DIWANIYA5 ينتهي خلال ٣٠ يوماً وتم استخدامه عدة مرات.', type: 'info', read: true, date: at(5, 13).toISOString() },
  ];

  // ------------------------------------------------------------------ squads
  const squadNames = ['ديوانية الفيلكاوي', 'ديوانية الصقور', 'ديوانية أبناء الديرة', 'ديوانية النخبة', 'ديوانية الشباب الأصيل', 'ديوانية الوفاء'];
  const tiers = ['شلة ديوانية', 'عزوة', 'نواخذة', 'شيوخ'];
  const squads: Squad[] = squadNames.map((name, i) => {
    const members = customers.filter(c => c.diwaniyaName === name);
    const list = members.map((m, k) => ({ name: m.name, phone: m.phone, points: Math.floor((m.diwaniyaPoints || 0) / Math.max(1, members.length)) + 120 * (3 - (k % 3)) }));
    const points = list.reduce((s, m) => s + m.points, 0) + [14000, 9200, 7600, 4300, 2900, 1700][i];
    const tier = points >= 15000 ? tiers[3] : points >= 10000 ? tiers[2] : points >= 5000 ? tiers[1] : tiers[0];
    return { id: i + 1, name, points, tier, members: list.length, king: list[0]?.name || 'أبو خالد', kingOrders: members[0]?.totalOrders || 0, phone: list[0]?.phone || '55509999', membersList: list };
  });

  // ------------------------------------------------- AI / marketing / goals
  const pulseTexts: [string, string, string][] = [
    ['الأكل وايد طيب والتوصيل سريع', 'إيجابي', 'الطعم، التوصيل'],
    ['المجبوس ناطع بس الرز كان ناشف شوي', 'محايد', 'الطعم'],
    ['التغليف ممتاز والخدمة محترمة', 'إيجابي', 'التغليف، الخدمة'],
    ['تأخر الطلب نص ساعة عن الموعد', 'سلبي', 'التوصيل'],
    ['الأسعار مناسبة والكمية كافية للعائلة', 'إيجابي', 'السعر'],
    ['أحلى مطبق زبيدي جربته في حياتي', 'إيجابي', 'الطعم'],
    ['الحلويات حلوة بس تحتاج تنوع أكثر', 'محايد', 'الحلويات'],
    ['الخدمة على الواتساب سريعة وراقية', 'إيجابي', 'الخدمة'],
  ];
  const icon = (l: string) => (l === 'إيجابي' ? '😍' : l === 'سلبي' ? '😡' : '😐');
  const pulseReviews = pulseTexts.map(([text, l1, topics], i) => ({
    id: 1700000000000 + i, text, sentiment: `${l1} ${icon(l1)}`, level1: l1, topics, sentimentLabel: l1,
    sentimentAlert: l1 === 'سلبي' ? 'يحتاج متابعة' : '', createdAt: at(i * 3, 15).toISOString(), date: `${10 + i}:${i % 2 ? '30' : '05'} م`,
  }));
  const analysisBase = {
    topKeywords: ['الطعم', 'التوصيل', 'التغليف', 'السعر'],
    strengths: ['جودة الطعم التراثي', 'سرعة الرد على واتساب', 'تغليف حراري مرتب'],
    weaknesses: ['تأخر التوصيل أوقات الذروة', 'محدودية تنوع الحلويات'],
    recommendations: ['زيادة سائقين وقت الذروة (٧-٩ مساءً)', 'إضافة ٣ أصناف حلويات جديدة', 'مكافأة العملاء أصحاب التقييمات العالية'],
  };
  const pulseAnalysisHistory = [
    { id: 'pa1', date: at(20, 10).toISOString(), summary: 'انطباع إيجابي عام مع ملاحظات حول سرعة التوصيل.', commentsSnapshot: pulseTexts.slice(0, 4).map(t => t[0]), sentiment: { positive: 68, neutral: 22, negative: 10 }, ...analysisBase },
    { id: 'pa2', date: at(5, 10).toISOString(), summary: 'تحسن ملحوظ في رضا العملاء بعد تحسين التغليف.', commentsSnapshot: pulseTexts.slice(2, 8).map(t => t[0]), sentiment: { positive: 74, neutral: 18, negative: 8 }, ...analysisBase },
  ];
  const pulseArchiveAnalysis = { summary: 'تحليل الأرشيف: الطعم والخدمة نقاط القوة الأبرز، والتوصيل وقت الذروة أهم فرصة للتحسين.', sentiment: { positive: 72, neutral: 19, negative: 9 }, topKeywords: analysisBase.topKeywords, strengths: analysisBase.strengths, weaknesses: analysisBase.weaknesses, recommendations: analysisBase.recommendations };
  const deepArchiveAnalysis = { dataReference: `تحليل ${paidInv.length} فاتورة و ${orders.length} طلباً`, sentimentScore: 78, sentiment: 'إيجابي جداً', topRepeated: ['مجبوس دجاج', 'مطبق زبيدي', 'وليمة غنم'], ...analysisBase };

  const campaigns = [
    { id: 'cmp1', topic: 'عزايم عطلة نهاية الأسبوع', idea: 'باقة الوليمة العائلية مع قهوة عربية مجانية', message: 'عزيمتكم علينا! اطلبوا وليمة الغنم النعيمي واستمتعوا بدلة قهوة عربية هدية 🍖☕', marketingMessage: 'وليمة الخميس: وليمة غنم + دلة قهوة هدية', targetAudience: 'العائلات وأصحاب الديوانيات', timing: 'الأربعاء مساءً', expectedOutcome: 'زيادة مبيعات الولائم ٢٠٪', status: 'launched', createdAt: at(12, 10).toISOString() },
    { id: 'cmp2', topic: 'استرجاع العملاء الغائبين', idea: 'خصم ١٠٪ للعملاء الذين لم يطلبوا منذ ٦٠ يوماً', message: 'اشتقنا لكم! خصم ١٠٪ على طلبكم القادم بكود TURATH10', marketingMessage: 'اشتقنا لك - خصم ١٠٪ بانتظارك', targetAudience: 'العملاء المتوقفون', timing: 'الأحد ١٠ ص', expectedOutcome: 'استرجاع ١٥ عميلاً', status: 'launched', createdAt: at(30, 10).toISOString() },
    { id: 'cmp3', topic: 'موسم المناسبات الوطنية', idea: 'صواني ضيافة للمدارس والشركات', message: 'احتفل مع فريقك بصواني التراث الكويتي للمناسبات الوطنية 🇰🇼', marketingMessage: 'ضيافة وطنية بنكهة التراث', targetAudience: 'الشركات والمدارس', timing: 'قبل المناسبة بأسبوعين', expectedOutcome: 'حجوزات مؤسسية', status: 'draft', createdAt: at(3, 10).toISOString() },
  ];
  const aiLearningMemory = [
    { id: 'ai1', predictionDate: at(40, 9).toISOString(), evaluationDate: at(33, 9).toISOString(), context: 'توقع ارتفاع الطلب على الولائم في عطلة نهاية الأسبوع', predictedOutcome: 'زيادة ١٥٪', actualOutcome: 'زيادة ١٧٪', isAccurate: true, status: 'evaluated' as const },
    { id: 'ai2', predictionDate: at(30, 9).toISOString(), evaluationDate: at(23, 9).toISOString(), context: 'أثر حملة الخصم على عملاء الديوانيات', predictedOutcome: 'استرجاع ١٠ عملاء', actualOutcome: 'استرجاع ٦ عملاء', isAccurate: false, correctionApplied: 'خفض التوقع للحملات المشابهة ٢٥٪', status: 'evaluated' as const },
    { id: 'ai3', predictionDate: at(14, 9).toISOString(), evaluationDate: at(7, 9).toISOString(), context: 'نفاد مخزون الدجاج المشوي مساء الجمعة', predictedOutcome: 'نفاد قبل ٨ مساءً', actualOutcome: 'نفاد ٧:٤٠ مساءً', isAccurate: true, status: 'evaluated' as const },
    { id: 'ai4', predictionDate: at(2, 9).toISOString(), evaluationDate: at(-5, 9).toISOString(), context: 'ارتفاع الطلب على المشروبات الباردة', predictedOutcome: 'زيادة ٢٠٪', status: 'pending' as const },
  ];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSales = paidInv.filter(i => new Date(i.date) >= monthStart).reduce((s, i) => s + i.totalAmount, 0);
  const activeGoal = { id: 'goal1', title: 'مبيعات الشهر الحالي', type: 'increase_sales' as const, category: 'revenue' as const, targetValue: Math.ceil((monthSales * 1.35) / 100) * 100 + 300, currentValue: r3(monthSales), currentProgress: 74, targetPercentage: 15, startDate: monthStart.toISOString(), deadline: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(), baselineMetric: r3(monthSales * 0.85), status: 'active' as const };

  // --------------------------------------------------------------------- state
  const state: AppState = {
    customers,
    suppliers,
    products,
    invoices,
    expenses,
    supplierTransfers,
    productCategories: base.categories,
    settings: {
      gatewayFeeAmount: 0.2,
      openingCashBalance: 4200,
      cashTrackingStartDate: at(190, 0).toISOString().slice(0, 10),
      companyName: 'شركة مطبخ التراث الكويتي',
      companyLogo: '',
      restaurantNumbers: ['55500111', '55500222'],
      productCategories: base.categories,
      menuCategories: base.categories,
      notifications: { lateInvoices: true, salesGoals: true, newCustomers: true },
      storeStatus: {
        isOpen: true,
        manualClose: false,
        closeMessage: 'المعذرة، المتجر مسكر الحين وما نستقبل طلبات جديدة.',
        openingHours: Object.fromEntries(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(d => [d, { open: '09:00', close: '23:00', enabled: true }])),
      },
    },
    notifications,
    testimonials,
    zones: base.zones,
    orders,
    promocodes: promoDefs,
    squads,
    squadTiers: base.squadTiers,
    diwaniyaTiers: base.diwaniyaTiers,
    loyaltySettings: { expirationDays: 365, isDynamicEnabled: true },
    activeGoal: activeGoal as any,
    aiLearningMemory: aiLearningMemory as any,
    campaigns: campaigns as any,
    pulseReviews,
    pulseArchiveAnalysis,
    pulseAnalysisHistory: pulseAnalysisHistory as any,
    deepArchiveAnalysis,
    nameMatchMemory: {},
  };
  // Derive supplier balances/status with the app's own settlement engine so every screen agrees.
  return recalculateStateBalances(state);
}

/** Smart-studio archive samples (demo only). Pictures are self-contained SVGs. */
export function demoStudioArchive(storageKey: string): any[] {
  if (storageKey === 'smart_studio_reel_history') return demoReelArchive();
  if (storageKey !== 'smart_studio_history') return [];
  const rows: Array<[string, number, string, string]> = [
    ['وليمة الخميس العائلية', 22, '🍖', 'وليمة غنم نعيمي بنكهة الديرة - اطلبها قبل ٢٤ ساعة 🌿'],
    ['مجبوس دجاج عائلي', 20, '🍛', 'غداء الجمعة مع العائلة أحلى مع المجبوس التراثي'],
    ['مطبق زبيدي بلاتيني', 200, '🐟', 'المطبق الزبيدي… طعم أيام زمان في صينية وحدة'],
    ['قهوة الديوانية', 28, '☕', 'دلة قهوة عربية مع تمر لكل ديوانية تطلب هالأسبوع'],
    ['حلويات المناسبات', 330, '🍰', 'اختم عزيمتك بلقيمات وخبيصة كويتية أصيلة'],
    ['صواني الضيافة الوطنية', 140, '🇰🇼', 'ضيافة المناسبات الوطنية للشركات والمدارس'],
  ];
  return rows.map(([title, hue, emoji, caption], i) => ({
    url: productImage(title, hue, emoji, true),
    caption,
    date: new Date(Date.now() - (i * 3 + 1) * DAY).toISOString(),
    source: 'idea',
    format: '1:1',
    theme: title,
    customIdea: title,
  }));
}
