import { AppState, Notification, PaymentMethod, Order, Product } from './types';

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const kuwaitZones = [
      'مدينة الكويت', 'دسمان', 'شرق', 'الصوابر', 'المرقاب', 'القبلة', 'الصالحية', 'الوطية', 'بنيد القار',
      'الدسمة', 'الدعية', 'المنصورية', 'ضاحية عبد الله السالم', 'النزهة', 'الفيحاء', 'الشامية', 'الروضة',
      'العديلية', 'الخالدية', 'كيفان', 'القادسية', 'قرطبة', 'السرة', 'اليرموك', 'الشويخ', 'الشويخ الصناعية',
      'ميناء الشويخ', 'الصليبخات', 'الدوحة', 'غرناطة', 'القيروان', 'شمال غرب الصليبيخات', 'النهضة',
      'جابر الأحمد', 'القادسية', 'حولي', 'السالمية', 'الرميثية', 'الجابرية', 'سلوى', 'بيان', 'مشرف', 'الشعب', 'البدع',
      'أنجفة', 'السلام', 'حطين', 'الشهداء', 'الصديق', 'الزهراء', 'النقرة', 'ضاحية مبارك العبد الله الجابر',
      'منطقة الوزارات', 'مبارك الكبير', 'العدان', 'القصور', 'القرين', 'صباح السالم', 'المسيلة', 'المسايل',
      'أبو فطيرة', 'أبو الحصانية', 'الفنيطيس', 'صبحان', 'صبحان الصناعية', 'غرب أبو فطيرة الحرفية', 'الفروانية',
      'خيطان', 'خيطان الجديدة', 'أبرق خيطان', 'جليب الشيوخ', 'العباسية', 'الأندلس', 'إشبيلية', 'العمرية',
      'الرابية', 'الرحاب', 'الرقعي', 'الفردوس', 'العارضية', 'العارضية الصناعية', 'الري', 'الري الصناعية',
      'الحساوي', 'الشدادية', 'الضجيج', 'ضاحية صباح الناصر', 'ضاحية عبد الله المبارك', 'غرب عبد الله المبارك',
      'جنوب عبد الله المبارك', 'الأحمدي', 'الفحيحيل', 'المنقف', 'أبو حليفة', 'الصباحية', 'الرقة', 'هدية',
      'الظهر', 'العقيلة', 'الفنطاس', 'المهبولة', 'المقوع', 'الوفرة', 'الوفرة الزراعية', 'الزور', 'الخيران',
      'مدينة الخيران', 'مدينة صباح الأحمد', 'مدينة صباح الأحمد البحرية', 'النويصيب', 'بنيدر', 'الجليعة',
      'الضباعية', 'ميناء عبد الله', 'الشعيبة', 'واره', 'ضاحية جابر العلي', 'ضاحية فهد الأحمد',
      'ضاحية علي صباح السالم', 'الجهراء', 'الجهراء القديمة', 'الجهراء الجديدة', 'القصر', 'الواحة', 'النعيم',
      'النسيم', 'العيون', 'تيماء', 'الصليبية', 'أمغرة', 'العبدلي', 'كبد', 'السالمي', 'كاظمة', 'الروضتين',
      'الصبية', 'المطلاع', 'مدينة سعد العبد الله', 'مدينة نواف الأحمد', 'مدينة الحرير', 'بوبيان', 'وربة',
      'فيلكا', 'كبر', 'عوهة', 'أم المرادم', 'قاروه', 'مسكان', 'أم النمل', 'جزيرة الشويخ'
    ].sort((a, b) => a.localeCompare(b, 'ar')).map((name, i) => ({
      id: `z${i}`,
      name,
      cost: 2.000,
      profit: 0,
      finalPrice: 2.000,
      isActive: true
    }));

export const DEFAULT_SQUADS = [
    { id: 1, name: 'ديوانية الفيلكاوي', points: 0, tier: 'عزوة', members: 1, king: 'أبو أحمد', kingOrders: 0, phone: '90000000', membersList: [{name: 'أبو أحمد', phone: '56855555', points: 0}] }
];


export const DEFAULT_SQUAD_TIERS = [
  { id: '1', name: 'شلة ديوانية', minPoints: 0, maxPoints: 4999, color: 'text-orange-700', bg: 'bg-orange-50', icon: '🏅', benefit: 'بداية التجمع' },
  { id: '2', name: 'عزوة', minPoints: 5000, maxPoints: 9999, color: 'text-slate-700', bg: 'bg-slate-100', icon: '⭐', benefit: 'خصم 10% ثابت' },
  { id: '3', name: 'نواخذة', minPoints: 10000, maxPoints: 14999, color: 'text-amber-700', bg: 'bg-amber-50', icon: '👑', benefit: 'مقبلات مجانية مع طلبات الشلة' },
  { id: '4', name: 'شيوخ', minPoints: 15000, maxPoints: 999999999, color: 'text-purple-700', bg: 'bg-purple-50', icon: '🏆', benefit: 'صينية ضيافة مجانية كل 10 طلبات' },
];

export const DEFAULT_DIWANIYA_TIERS = [
  { id: 1, name: 'شلة ديوانية', points: '0', label: 'بداية التجمع', color: 'from-orange-400 to-orange-600', bgClass: 'border-orange-200 bg-orange-50/50', iconType: 'Medal' },
  { id: 2, name: 'عزوة', points: '5,000', label: 'خصم 10% ثابت', color: 'from-slate-300 to-slate-500', bgClass: 'border-slate-300 bg-slate-50/50', iconType: 'Star' },
  { id: 3, name: 'نواخذة', points: '10,000', label: 'مقبلات مجانية مع طلبات الشلة', color: 'from-yellow-400 to-amber-600', bgClass: 'border-amber-300 bg-amber-50', iconType: 'Crown' },
  { id: 4, name: 'شيوخ', points: '15,000', label: 'صينية ضيافة مجانية كل 10 طلبات', color: 'from-purple-500 to-fuchsia-700', bgClass: 'border-purple-300 bg-purple-50 shadow-lg', iconType: 'Trophy' },
];

export const INITIAL_DATA: AppState = {
  customers: [],
  suppliers: [],
  products: [],
  invoices: [],
  expenses: [],
  supplierTransfers: [],
  productCategories: ['الولائم', 'اللحوم', 'الدجاج', 'البحري', 'المشويات', 'المقبلات', 'المشروبات'],
  settings: {
    gatewayFeeAmount: 0.200,
    companyName: 'شركة مطبخ التراث الكويتي',
    companyLogo: '',
    restaurantNumbers: [],
    productCategories: ['الولائم', 'اللحوم', 'الدجاج', 'البحري', 'المشويات', 'المقبلات', 'المشروبات'],
    notifications: {
      lateInvoices: true,
      salesGoals: true,
      newCustomers: true
    },
    storeStatus: {
      isOpen: true,
      manualClose: false,
      closeMessage: 'المعذرة، المتجر مسكر الحين وما نستقبل طلبات جديدة.',
      openingHours: {
        sunday: { open: '09:00', close: '23:00', enabled: true },
        monday: { open: '09:00', close: '23:00', enabled: true },
        tuesday: { open: '09:00', close: '23:00', enabled: true },
        wednesday: { open: '09:00', close: '23:00', enabled: true },
        thursday: { open: '09:00', close: '23:00', enabled: true },
        friday: { open: '09:00', close: '23:00', enabled: true },
        saturday: { open: '09:00', close: '23:00', enabled: true }
      }
    }
  },
  notifications: [],
  testimonials: [],
  zones: kuwaitZones,
  orders: [],
  squads: DEFAULT_SQUADS,
  squadTiers: DEFAULT_SQUAD_TIERS,
  diwaniyaTiers: DEFAULT_DIWANIYA_TIERS,
  pulseReviews: [],
  pulseArchiveAnalysis: null,
  pulseAnalysisHistory: [],
  aiLearningMemory: [],
  campaigns: [],
  nameMatchMemory: {}
};

export const GET_DEMO_DATA = (): AppState => {
    // Realistic Arabic names for persons
    const personNames = [
        'خالد المطيري', 'سارة الكندري', 'محمد العجمي', 'نورة العتيبي', 'يوسف الدوسري',
        'مريم الشمري', 'عبدالرحمن الظفيري', 'فاطمة الرشيدي', 'عبدالله العنزي', 'لولوة الخالد',
        'علي الصباح', 'فهد الغانم', 'جاسم الفليج', 'هنادي العبدالرزاق', 'سعد الملا',
        'منى العيسى', 'بدر القحطاني', 'دلال الهاجري', 'فيصل القلاف', 'شهد بهبهاني',
        'منصور الشطي', 'ليلى حسن', 'مشعل السالم', 'ألطاف القطان', 'سعود العازمي',
        'إيمان الصراف', 'نايف المرزوق', 'لطيفة المنصور', 'ياسر العلي', 'حصة الصالح'
    ];
    
    const companies = ["ديوانية الهاشم", "مجموعة الضيافة الكبرى", "شركة النقل الوطنية", "مكتب الفوزان للاستشارات", "مؤسسة الرؤية العقارية"];

    const getRandomName = (i: number) => {
        if (i % 6 === 0) return companies[(i / 6) % companies.length];
        return personNames[i % personNames.length];
    };

    const diwaniyasData = DEFAULT_SQUADS;

    const customers = Array.from({ length: 40 }, (_, i) => {
        const lastOrderDate = new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString();
        
        // Sometimes match a customer to a diwaniya from the list above
        let diwaniyaName = undefined;
        let diwaniyaPoints = undefined;
        let phone = undefined;
        
        if (i === 0) {
            phone = '56855555';
            diwaniyaName = diwaniyasData[0].name;
            diwaniyaPoints = diwaniyasData[0].points;
        } else if (i < 10) {
            const diw = diwaniyasData[i % diwaniyasData.length];
            diwaniyaName = diw.name;
            diwaniyaPoints = diw.points;
            phone = diw.membersList![0].phone;
        } else {
            phone = `${Math.random() > 0.5 ? '9' : '6'}${Math.floor(Math.random() * 9000000) + 1000000}`;
        }

        return {
            id: `c${i}`,
            name: getRandomName(i),
            phone,
            status: i % 15 === 0 ? 'inactive' as const : 'active' as const,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: lastOrderDate,
            loyaltyPoints: Math.floor(Math.random() * 1000),
            diwaniyaName,
            diwaniyaPoints,
            sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
            lastActive: lastOrderDate
        };
    });

    const products = [
        { id: 'p1', name: 'غداء التراث العائلي (مجبوس دجاج)', cost: 3.500, price: 12.500, category: 'رئيسي', supplierId: 's1', matrixCategory: 'star' as const, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&q=80' },
        { id: 'p2', name: 'مطبق زبيدي بلاتينيوم', cost: 7.000, price: 24.500, category: 'رئيسي', supplierId: 's2', matrixCategory: 'star' as const, imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=300&q=80' },
        { id: 'p3', name: 'وليمة لحم نعيمي غنم (في آي بي)', cost: 8.500, price: 28.000, category: 'رئيسي', supplierId: 's2', matrixCategory: 'star' as const, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265547?auto=format&fit=crop&w=300&q=80' },
        { id: 'p4', name: 'جريش لحم ناطع', cost: 2.500, price: 6.500, category: 'جانبي', supplierId: 's3', matrixCategory: 'puzzle' as const, imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356c33?auto=format&fit=crop&w=300&q=80' },
        { id: 'p5', name: 'حمسة ربيان التراث', cost: 3.000, price: 8.500, category: 'جانبي', supplierId: 's1', matrixCategory: 'puzzle' as const, imageUrl: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?auto=format&fit=crop&w=300&q=80' },
        { id: 'p6', name: 'سلطة تبولة كويتية', cost: 0.800, price: 2.250, category: 'مقبلات', supplierId: 's4', matrixCategory: 'horse' as const, imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3675fe?auto=format&fit=crop&w=300&q=80' },
        { id: 'p7', name: 'شوربة عدس التراث', cost: 0.500, price: 1.250, category: 'مقبلات', supplierId: 's4', matrixCategory: 'dog' as const, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&q=80' },
        { id: 'p8', name: 'لقيمات التراث بالدبس', cost: 0.400, price: 2.250, category: 'حلويات', supplierId: 's2', matrixCategory: 'star' as const, imageUrl: 'https://images.unsplash.com/photo-1612203852011-b44c5383f982?auto=format&fit=crop&w=300&q=80' },
        { id: 'p9', name: 'برياني دجاج ديلوكس', cost: 2.800, price: 9.500, category: 'رئيسي', supplierId: 's1', matrixCategory: 'star' as const, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&q=80' },
        { id: 'p10', name: 'لبن بالنعناع المبرد', cost: 0.250, price: 1.500, category: 'مشروبات', supplierId: 's5', matrixCategory: 'horse' as const, imageUrl: 'https://images.unsplash.com/photo-1563178406-4cdc29232120?auto=format&fit=crop&w=300&q=80' }
    ];

    const generateInvoices = () => {
        const invs = [];
        const now = new Date();
        for (let i = 0; i < 300; i++) {
            const date = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000);
            const isCash = Math.random() > 0.8;
            const items = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => {
                const p = products[Math.floor(Math.random() * products.length)];
                return {
                    productId: p.id,
                    quantity: Math.floor(Math.random() * 2) + 1,
                    priceAtTime: p.price,
                    costAtTime: p.cost
                };
            });
            const amountBeforeFees = items.reduce((s, it) => s + (it.priceAtTime * it.quantity), 0);
            const totalCost = items.reduce((s, it) => s + (it.costAtTime * it.quantity), 0);
            const deliveryFee = 1.000;
            const gatewayFee = isCash ? 0 : 0.250;
            const totalAmount = amountBeforeFees + deliveryFee;
            const customer = customers[Math.floor(Math.random() * customers.length)];
            
            invs.push({
                id: `INV-${5000 + i}`,
                customerId: customer.id,
                date: date.toISOString(),
                items,
                totalAmount: Number(totalAmount.toFixed(3)),
                deliveryFee: 1.000,
                discount: 0,
                totalCost: Number(totalCost.toFixed(3)),
                profit: Number((totalAmount - totalCost - gatewayFee).toFixed(3)),
                paymentMethod: (isCash ? 'Cash' : ['KNet', 'Link', 'BankTransfer'][Math.floor(Math.random() * 3)]) as PaymentMethod,
                isDeleted: false,
                updatedAt: date.toISOString()
            });
        }
        return invs;
    };

    const invoices = generateInvoices();

    // Re-calculate customer stats based on generated invoices
    customers.forEach(c => {
        const customerInvoices = invoices.filter(inv => inv.customerId === c.id);
        c.totalOrders = customerInvoices.length;
        c.totalSpent = Number(customerInvoices.reduce((s, inv) => s + inv.totalAmount, 0).toFixed(3));
        if (customerInvoices.length > 0) {
            const sorted = [...customerInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            c.lastOrderDate = sorted[0].date;
            c.lastActive = sorted[0].date;
        }
        c.loyaltyPoints = Math.floor(c.totalSpent);
    });

    const suppliers = [
        { id: 's1', name: 'المتحدة للدواجن الكويتية', phone: '22211100', paymentMethods: ['BankTransfer', 'KNet'] as PaymentMethod[], balance: 0, status: 'paid' as const },
        { id: 's2', name: 'شركة المواشي الوطنية', phone: '22233344', paymentMethods: ['BankTransfer'] as PaymentMethod[], balance: 0, status: 'paid' as const },
        { id: 's3', name: 'مطاحن الدقيق والمخابز', phone: '22255566', paymentMethods: ['BankTransfer', 'Link'] as PaymentMethod[], balance: 0, status: 'paid' as const },
        { id: 's4', name: 'شركة الخضار المركزية', phone: '22277788', paymentMethods: ['Cash', 'BankTransfer'] as PaymentMethod[], balance: 0, status: 'paid' as const },
        { id: 's5', name: 'مصنع الألبان الكويتي', phone: '22299900', paymentMethods: ['Link', 'BankTransfer'] as PaymentMethod[], balance: 0, status: 'paid' as const }
    ];

    const expenses = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));
        const descriptions = [
            'رسوم تعاون المطابخ السحابية', 'رسوم إدارة الجودة واللوجستيات', 'تسويق واعلانات انستغرام', 
            'اشتراكات برامج سحابية', 'رسوم بوابة الدفع', 'مصاريف تشغيلية عامة', 
            'صيانة تقنية للمنصة', 'خدمات برمجية', 'اشتراكات المنصات اللوجستية', 'مواد تغليف فاخرة'
        ];
        return {
            id: `exp-${i}`,
            description: descriptions[i % descriptions.length],
            category: i < 2 ? 'أجور وإيجارات' : 'مصروفات تشغيلية',
            amount: i === 0 ? 850 : i === 1 ? 1200 : [80, 25, 15, 45, 60, 30, 40, 50][i % 8],
            paymentMethod: 'BankTransfer' as PaymentMethod,
            date: date.toISOString()
        };
    });

    return {
        customers,
        suppliers,
        products,
        invoices,
        expenses,
        supplierTransfers: [
            { id: 't-1', supplierId: 's1', amount: 50.000, remainingAmount: 0, method: 'BankTransfer', date: '2024-03-20T10:00:00Z', notes: 'سداد دفعة مقدمة' },
            { id: 't-2', supplierId: 's2', amount: 35.500, remainingAmount: 0, method: 'KNet', date: '2024-03-15T14:30:00Z', notes: 'تسوية فاتورة الخضار' },
            { id: 't-3', supplierId: 's3', amount: 120.000, remainingAmount: 0, method: 'BankTransfer', date: '2024-03-10T11:45:00Z', notes: 'دفعة شهر مارس' }
        ],
        settings: {
            gatewayFeeAmount: 0.250,
            companyName: 'شركة مطبخ التراث الكويتي',
            companyLogo: '',
            restaurantNumbers: ['99911122', '22233344'],
            productCategories: ['الولائم', 'اللحوم', 'الدجاج', 'البحري', 'المشويات', 'المقبلات', 'المشروبات'],
            notifications: {
                lateInvoices: true,
                salesGoals: true,
                newCustomers: true
            },
            storeStatus: {
              isOpen: true,
              manualClose: false,
              closeMessage: 'المعذرة، المتجر مسكر الحين وما نستقبل طلبات جديدة.',
              openingHours: {
                sunday: { open: '09:00', close: '23:00', enabled: true },
                monday: { open: '09:00', close: '23:00', enabled: true },
                tuesday: { open: '09:00', close: '23:00', enabled: true },
                wednesday: { open: '09:00', close: '23:00', enabled: true },
                thursday: { open: '09:00', close: '23:00', enabled: true },
                friday: { open: '09:00', close: '23:00', enabled: true },
                saturday: { open: '09:00', close: '23:00', enabled: true }
              }
            }
        },
        notifications: [
            { id: 'n1', title: 'تحليل أداء VIP', message: 'العميل "خالد المطيري" حقق أعلى قيمة مشتريات هذا الأسبوع. قد يحتاج مكافأة.', type: 'warning', read: false, date: new Date().toISOString() },
            { id: 'n2', title: 'هدف يومي محقق ✨', message: 'تم الوصول لهدف المبيعات اليومي (500 د.ك). ماشاء الله!', type: 'success', read: false, date: new Date().toISOString() },
            { id: 'n3', title: 'تنبيه عميل مفقود', message: 'العميلة "سارة الكندري" لم تطلب منذ فترة طويلة. تواصل معها!', type: 'info', read: false, date: new Date().toISOString() }
        ],
        testimonials: [
            { id: 't1', customerName: 'خالد المطيري', content: 'تجربة فريدة مع علامة التراث! الجودة خيالية والتغليف ممتاز جداً. الطعم كويتي أصيل ويجمل دايم.', date: new Date().toISOString(), source: 'WhatsApp', rating: 5, invoiceId: 'INV-5001' },
            { id: 't2', customerName: 'سارة الكندري', content: 'خدمة التموين كانت متميزة في عشاء العزيمة، بيضتوا وجهي قدام ضيوفي. المنتجات وصلت بجودة عالية جداً.', date: new Date().toISOString(), source: 'Instagram', rating: 5, invoiceId: 'INV-5002' },
            { id: 't3', customerName: 'محمد العجمي', content: 'التوصيل سريع والطلب يوصل مرتب وراقي.. بس صراحة كان التغليف يحتاج لزيادة جودة المرة هذي.', date: new Date().toISOString(), source: 'Direct', rating: 3, invoiceId: 'INV-5003' }
        ],
        zones: kuwaitZones,
        orders: [
            {
                id: 'ORD-TEST-001',
                customerId: customers[0].id,
                customerName: customers[0].name,
                customerPhone: customers[0].phone,
                regionId: 'z5',
                status: 'pending',
                date: new Date().toISOString(),
                totalAmount: 35.000,
                notes: 'تأكد من الملاعق والمناديل الإضافية',
                items: [
                    { productId: 'p1', quantity: 2, priceAtTime: 12.500, costAtTime: 3.500, itemNotes: 'بدون بصل' },
                    { productId: 'p4', quantity: 1, priceAtTime: 6.500, costAtTime: 2.500, itemNotes: 'أقل فلفل' }
                ]
            }
        ],
        squads: diwaniyasData
    };
};

export const GENERATE_PERFORMANCE_SIMULATION_DATA = (): AppState => {
    const firstNames = ['خالد', 'سارة', 'محمد', 'نورة', 'يوسف', 'مريم', 'عبدالرحمن', 'فاطمة', 'عبدالله', 'لولوة', 'علي', 'فهد', 'جاسم', 'سعد', 'منى', 'بدر', 'دلال', 'فيصل', 'شهد', 'منصور', 'ليلى', 'مشعل', 'سعود', 'إيمان', 'نايف', 'لطيفة', 'ياسر', 'حصة', 'أحمد', 'أنوار', 'حسين', 'سليمان', 'فيصل', 'عبدالمحسن', 'حامد', 'طارق', 'جمال', 'مشاري', 'ضاري', 'فيصل', 'مبارك'];
    const middleNames = ['عبدالله', 'محمد', 'خالد', 'فهد', 'علي', 'صالح', 'سالم', 'أحمد', 'جاسم', 'سعد', 'بدر', 'ناصر', 'سليمان', 'عبدالرحمن', 'مبارك', 'حمد', 'وليد'];
    const familyNames = ['المطيري', 'الكندري', 'العجمي', 'العتيبي', 'الدوسري', 'الشمري', 'الرشيدي', 'العنزي', 'الصباح', 'الغانم', 'الملا', 'القحطاني', 'الهاجري', 'بهبهاني', 'الشطي', 'العازمي', 'الصراف', 'المرزوق', 'المنصور', 'العلي', 'الفضلي', 'الحربي', 'المطوع', 'الرفاعي', 'القطان', 'البغلي', 'الخرينج', 'العوضي', 'الخالدي', 'الديحاني'];

    const getUniqueName = (index: number) => {
        const first = firstNames[index % firstNames.length];
        const middle = middleNames[(index + 3) % middleNames.length];
        const family = familyNames[(index + 17) % familyNames.length];
        return `${first} ${middle} ${family} (#${index})`;
    };

    const customers = Array.from({ length: 5000 }, (_, i) => {
        const id = `CUST-SIM-${i + 1}`;
        const name = getUniqueName(i);
        const prefixes = ['5', '6', '9'];
        const phone = `${prefixes[i % prefixes.length]}${String(1000000 + i)}`; 
        const status: 'active' | 'slow' | 'inactive' = i % 10 < 7 ? 'active' : (i % 10 < 9 ? 'slow' : 'inactive');
        
        const daysAgo = Math.floor(Math.random() * (status === 'active' ? 30 : status === 'slow' ? 90 : 180));
        const lastOrderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        
        return {
            id,
            name,
            phone,
            email: `sim.cust.${i + 1}@example.com`,
            status,
            lastOrderDate,
            lastActive: lastOrderDate,
            totalOrders: 0,
            totalSpent: 0,
            loyaltyPoints: Math.floor(Math.random() * 200),
            sentiment: (i % 3 === 0 ? 'positive' : (i % 3 === 1 ? 'neutral' : 'negative')) as any,
            area: kuwaitZones[i % kuwaitZones.length].name,
            address: `قطعة ${1 + (i % 4)}، شارع ${10 + (i % 10)}، جادة ${1 + (i % 3)}، منزل ${1 + (i % 50)}`,
        };
    });

    const products = [
        { id: 'p1', name: 'مكبوس دجاج هيبة التراث', price: 12.500, cost: 3.500 },
        { id: 'p2', name: 'قوزي لحم حاشي فاخر', price: 24.000, cost: 7.500 },
        { id: 'p3', name: 'مطبق زبيدي كويتي أصيل', price: 18.000, cost: 6.000 },
        { id: 'p4', name: 'برياني دجاج ديرتنا', price: 6.500, cost: 2.000 },
        { id: 'p5', name: 'دولمة كويتية ناطعة', price: 10.000, cost: 3.000 },
        { id: 'p6', name: 'مقبلات مشكلة ديوانية', price: 4.500, cost: 1.200 },
        { id: 'p7', name: 'مشروبات غازية منعشة', price: 0.500, cost: 0.150 },
    ];

    const generateRandomItems = (orderIndex: number) => {
        const numItems = 1 + (orderIndex % 3);
        const items = [];
        let totalAmount = 0;
        for (let j = 0; j < numItems; j++) {
            const prod = products[(orderIndex + j) % products.length];
            const quantity = 1 + ((orderIndex + j) % 2);
            items.push({
                productId: prod.id,
                quantity,
                priceAtTime: prod.price,
                costAtTime: prod.cost,
            });
            totalAmount += prod.price * quantity;
        }
        return { items, totalAmount };
    };

    const paymentMethods = ['KNet', 'Cash', 'Link', 'BankTransfer'];

    const orders: Order[] = [];
    const invoices: any[] = [];

    const msIn6Months = 180 * 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 10000; i++) {
        const orderId = `ORD-SIM-${100001 + i}`;
        const invoiceId = `INV-SIM-${100001 + i}`;
        const customer = customers[i % customers.length];
        const { items, totalAmount } = generateRandomItems(i);
        const status = i % 100 < 5 ? 'cancelled' : (i % 100 < 15 ? 'pending' : 'completed');
        const payMethod = paymentMethods[i % paymentMethods.length];
        const dateStr = new Date(Date.now() - (i / 10000) * msIn6Months).toISOString();
        
        if (status !== 'cancelled') {
            customer.totalOrders += 1;
            customer.totalSpent += totalAmount;
            if (!customer.lastOrderDate || new Date(dateStr) > new Date(customer.lastOrderDate)) {
                customer.lastOrderDate = dateStr;
                customer.lastActive = dateStr;
            }
        }

        orders.push({
            id: orderId,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            regionId: `z${1 + (i % 8)}`,
            status,
            date: dateStr,
            totalAmount,
            notes: i % 20 === 0 ? 'توصيل متميز مع التغليف الحاذر' : undefined,
            items,
            address: customer.address,
            linkedInvoiceId: invoiceId,
        });

        invoices.push({
            id: invoiceId,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            date: dateStr,
            totalAmount,
            isPaid: status === 'completed',
            paymentStatus: status === 'completed' ? 'paid' : (status === 'pending' ? 'pending' : 'cancelled'),
            paymentMethod: payMethod as any,
            items,
            isDeleted: false,
            notes: i % 20 === 0 ? 'فاتورة محاكاة سريعة' : undefined,
        });
    }

    return {
        customers: customers as any[],
        suppliers: [
            { id: 's1', name: 'شركة دواجن الكويت', phone: '99881122', paymentMethods: ['BankTransfer'], balance: 1350, status: 'pending' },
            { id: 's2', name: 'المركز الوطني للحوم', phone: '66554433', paymentMethods: ['BankTransfer', 'KNet'], balance: 2400, status: 'partially_paid' },
            { id: 's3', name: 'شركة مطاحن دقيق الكويت', phone: '22334455', paymentMethods: ['Cash'], balance: 0, status: 'paid' }
        ],
        products: products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.id === 'p6' ? 'المقبلات' : (p.id === 'p7' ? 'المشروبات' : 'الولائم'),
            price: p.price,
            cost: p.cost,
            supplierId: 's1',
            isActive: true
        })),
        invoices,
        expenses: Array.from({ length: 15 }, (_, i) => ({
            id: `E-SIM-${i + 1}`,
            description: i % 2 === 0 ? 'دفع رواتب الطهاة' : 'شراء ديزل للسيارات والمولدات',
            category: i % 2 === 0 ? 'أجور وإيجارات' : 'مصروفات تشغيلية',
            amount: i % 2 === 0 ? 1200 : 85,
            paymentMethod: 'BankTransfer' as PaymentMethod,
            date: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1050).toISOString()
        })),
        supplierTransfers: [
            { id: 't-1', supplierId: 's1', amount: 50.000, remainingAmount: 0, method: 'BankTransfer', date: '2024-03-20T10:00:00Z', notes: 'سداد دفعة مقدمة' }
        ],
        settings: {
            gatewayFeeAmount: 0.250,
            companyName: 'مطبخ التراث الكويتي الذكي (محاكاة الأداء الأقصى)',
            companyLogo: '',
            restaurantNumbers: ['99911122'],
            productCategories: ['الولائم', 'اللحوم', 'الدجاج', 'البحري', 'المشويات', 'المقبلات', 'المشروبات'],
            notifications: { lateInvoices: true, salesGoals: true, newCustomers: true },
            storeStatus: {
                isOpen: true,
                manualClose: false,
                closeMessage: 'مغلق للصيانة المجدولة الحين',
                openingHours: {
                    sunday: { open: '09:00', close: '23:00', enabled: true },
                    monday: { open: '09:00', close: '23:00', enabled: true },
                    tuesday: { open: '09:00', close: '23:00', enabled: true },
                    wednesday: { open: '09:00', close: '23:00', enabled: true },
                    thursday: { open: '09:00', close: '23:00', enabled: true },
                    friday: { open: '09:00', close: '23:00', enabled: true },
                    saturday: { open: '09:00', close: '23:00', enabled: true }
                }
            }
        },
        notifications: [
            { id: 'n-sim-1', title: 'تقرير تشغيل المحاكاة 🚀', message: 'تم تشغيل محاكاة الأداء العالي بنجاح تام! 10,000 فاتورة و5,000 عميل نشط دون لمس قاعدة البيانات السحابية.', type: 'success', read: false, date: new Date().toISOString() }
        ],
        testimonials: [],
        zones: kuwaitZones,
        orders,
        squads: DEFAULT_SQUADS,
        squadTiers: DEFAULT_SQUAD_TIERS,
        diwaniyaTiers: DEFAULT_DIWANIYA_TIERS,
        pulseReviews: [],
        pulseArchiveAnalysis: null,
        pulseAnalysisHistory: [],
        aiLearningMemory: [],
        campaigns: [],
        nameMatchMemory: {}
    };
};
