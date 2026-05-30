import type { KuwaitOrderPlace } from './kuwaitContentPulse';
import type { StudioBackgroundPresetId, StudioRealityMode } from './studioReality';

export type ProductLike = { id?: string; name?: string; title?: string; category?: string; description?: string };
export type AlturathDishCategory = 'rice' | 'stew' | 'mahshi' | 'dessert' | 'box' | 'family' | 'diwaniya' | 'seafood' | 'grill' | 'generic';
export type AlturathStudioVariant = { id: 'delivery' | 'home' | 'diwaniya'; title: string; sceneId: string; shotId: string; desc: string };
export type AlturathStudioBrainResult = {
  hasInput: boolean; normalizedText: string; productNames: string[]; matchedProducts: string[]; isKnownProduct: boolean;
  category: AlturathDishCategory; categoryLabel: string; heatLabel: string; sceneId: string; pulseId: string;
  place: KuwaitOrderPlace; mode: StudioRealityMode; background: StudioBackgroundPresetId; shotId: string; mood: string;
  reason: string; confidence: number; warning?: string; strictProductOnlyMode: boolean; canGenerate: boolean; requiresProductSelection: boolean; primaryProductName?: string; productGuardMessage: string; productSuggestions: string[]; reelRecipe: string[]; variants: AlturathStudioVariant[]; promptGuard: string;
};

const normalizeArabic = (value: string) => String(value || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(normalizeArabic(word)));
export const getAlturathProductName = (product: ProductLike) => String(product?.name || product?.title || '').trim();
const productName = getAlturathProductName;


type KuwaitiDishVisualKind = 'rice' | 'stew' | 'mahshi' | 'dessert' | 'box' | 'family' | 'diwaniya' | 'seafood' | 'grill' | 'bread' | 'breakfast' | 'generic';
type KuwaitiDishKnowledge = {
  label: string;
  category: AlturathDishCategory;
  categoryLabel: string;
  heat: string;
  keywords: string[];
  visualLock: string;
  avoid: string;
  shotId?: string;
  sceneId?: string;
  background?: StudioBackgroundPresetId;
};

const KUWAITI_DISH_KNOWLEDGE: KuwaitiDishKnowledge[] = [
  {
    label: 'مطبق الزبيدي', category: 'seafood', categoryLabel: 'طبق بحري كويتي', heat: 'طبق عيش وسمك حار؛ بخار خفيف جدًا فقط',
    keywords: ['مطبق الزبيدي', 'مطبق زبيدي', 'مطبق سمك زبيدي', 'مطبق سمك'],
    visualLock: 'يجب أن يظهر كطبق مطبق زبيدي كويتي: سمك زبيدي أبيض/فضي واضح مع عيش/رز، وليس دجاجًا أو لحمًا أو مطبق خبز.',
    avoid: 'لا تستبدل الزبيدي بروبيان أو هامور أو دجاج، ولا تجعله خبز مطبق أو فطيرة.', shotId: 'top-spread', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'زبيدي', category: 'seafood', categoryLabel: 'سمك زبيدي', heat: 'سمك حار إذا كان مع عيش؛ بخار خفيف جدًا فقط',
    keywords: ['زبيدي', 'سمك زبيدي', 'زبدى'],
    visualLock: 'الزبيدي سمك كويتي أبيض/فضي واضح. يجب أن يبقى سمكًا، غالبًا مع عيش/رز أو تقديم بحري كويتي بسيط.',
    avoid: 'لا تحوله إلى دجاج أو لحم أو سمك مختلف، ولا تضع قواقع/سوشي/مأكولات بحرية أجنبية.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'برية اللحم', category: 'rice', categoryLabel: 'طبق عيش باللحم', heat: 'طبق عيش ولحم حار؛ بخار خفيف واقعي',
    keywords: ['برية اللحم', 'بريه اللحم', 'بريه لحم', 'برية لحم', 'بريه', 'برية'],
    visualLock: 'برية اللحم طبق عيش كويتي/خليجي باللحم. يجب أن يظهر عيش مع قطع لحم واضحة، وليس دجاجًا أو سمكًا أو مرقًا منفصلًا.',
    avoid: 'لا تحوله إلى برياني دجاج، ولا تضف سمكًا أو روبيانًا أو أطباق جانبية غير موجودة.', shotId: 'steam-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'مجبوس/مكبوس', category: 'rice', categoryLabel: 'طبق عيش رئيسي', heat: 'حار ويقبل بخارًا خفيفًا',
    keywords: ['مجبوس', 'مكبوس', 'مچبوس', 'مجبوس دجاج', 'مجبوس لحم', 'مكبوس دجاج', 'مكبوس لحم'],
    visualLock: 'مجبوس/مكبوس يعني عيش كويتي مع بروتين واضح حسب اسم المنتج: دجاج يبقى دجاجًا، لحم يبقى لحمًا، سمك يبقى سمكًا.',
    avoid: 'لا تبدل البروتين، ولا تضف بروتينًا ثانيًا غير موجود في المنتج.', shotId: 'steam-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'برياني', category: 'rice', categoryLabel: 'طبق عيش متبل', heat: 'حار ويقبل بخارًا خفيفًا',
    keywords: ['برياني', 'برياني دجاج', 'برياني لحم', 'برياني روبيان'],
    visualLock: 'البرياني عيش متبل بألوانه المعروفة مع البروتين المذكور فقط.',
    avoid: 'لا تحوله إلى مجبوس عادي أو تضيف بروتين غير مذكور.', shotId: 'steam-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'مربيان/روبيان', category: 'seafood', categoryLabel: 'طبق روبيان وعيش', heat: 'حار إذا كان عيش؛ بخار خفيف جدًا',
    keywords: ['مربين', 'مربيان', 'روبيان', 'ربيان', 'مجبوس روبيان', 'برياني روبيان'],
    visualLock: 'يجب أن يظهر الروبيان/المربيان كروبيان واضح مع عيش أو كتقديم بحري كويتي حسب المنتج.',
    avoid: 'لا تستبدله بسمك كامل أو دجاج أو لحم.', shotId: 'texture-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'مموش/معدس', category: 'rice', categoryLabel: 'طبق عيش شعبي', heat: 'حار لكن بخار خفيف جدًا',
    keywords: ['مموش', 'معدس', 'عيش مموش', 'عيش معدس'],
    visualLock: 'مموش/معدس طبق عيش شعبي واضح بحبوبه/عدسه، بدون تحويله لمجبوس دجاج أو برياني.',
    avoid: 'لا تضف بروتين كبير إذا لم يكن موجودًا في المنتج.', shotId: 'top-spread', sceneId: 'home-rice-tray', background: 'home-table'
  },

  {
    label: 'مطبق السمك', category: 'seafood', categoryLabel: 'طبق سمك وعيش', heat: 'طبق عيش وسمك حار؛ بخار خفيف جدًا فقط',
    keywords: ['مطبق هامور', 'مطبق شعري', 'مطبق كنعد', 'مطبق صبور', 'مطبق ميد', 'مطبق نقرور', 'مطبق بياح', 'مطبق شعم', 'مطبق نويبي', 'مطبق سمك'],
    visualLock: 'مطبق السمك الكويتي يعني سمك واضح مع عيش/رز. نوع السمك المذكور يجب أن يبقى واضحًا ولا يتحول إلى دجاج أو لحم أو فطيرة.',
    avoid: 'لا تجعله مطبق خبز، ولا تضف مأكولات بحرية أجنبية أو بروتين مختلف.', shotId: 'top-spread', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'أسماك كويتية', category: 'seafood', categoryLabel: 'طبق سمك كويتي', heat: 'حسب طريقة الطبخ؛ بخار خفيف فقط إذا كان حارًا',
    keywords: ['هامور', 'شعري', 'كنعد', 'صبور', 'ميد', 'نقرور', 'بياح', 'شعم', 'نويبي', 'سبيطي', 'سمك مقلي', 'سمك مشوي', 'مجبوس سمك', 'مرق سمك'],
    visualLock: 'أي اسم سمك كويتي يجب أن يظهر كسمك حقيقي واضح حسب المنتج، مع تقديم كويتي بسيط، وليس دجاجًا أو لحمًا أو طبقًا غربيًا.',
    avoid: 'لا تستخدم سوشي، محار، قواقع، سلمون غربي، أو ديكور بحري خيالي إذا لم يكن المنتج كذلك.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'برية الدجاج', category: 'rice', categoryLabel: 'طبق عيش بالدجاج', heat: 'طبق عيش ودجاج حار؛ بخار خفيف واقعي',
    keywords: ['برية الدجاج', 'بريه الدجاج', 'بريه دجاج', 'برية دجاج'],
    visualLock: 'برية الدجاج طبق عيش بالدجاج. يجب أن يظهر عيش مع دجاج واضح، وليس لحمًا أو سمكًا أو برياني عام.',
    avoid: 'لا تبدل الدجاج إلى لحم أو سمك، ولا تضف بروتينات أخرى.', shotId: 'steam-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'عيش شعبي كويتي', category: 'rice', categoryLabel: 'أطباق عيش شعبية', heat: 'حار غالبًا؛ بخار خفيف فقط',
    keywords: ['عيش لحم', 'عيش دجاج', 'عيش مشخول', 'عيش محمر', 'محمر', 'عيش ابيض', 'عيش أبيض', 'عيش زعفران', 'كبسه', 'كبسة', 'مضغوط'],
    visualLock: 'أطباق العيش يجب أن تبقى عيش/رز واضح مع البروتين أو النكهة المذكورة في المنتج فقط.',
    avoid: 'لا تضف بروتين غير مذكور ولا تحوله إلى مرق أو مشويات.', shotId: 'steam-close', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'مرق/صالونة', category: 'stew', categoryLabel: 'مرق وإيدام', heat: 'مرق حار؛ بخار خفيف ومقبول',
    keywords: ['مرق', 'صالونه', 'صالونة', 'ايدام', 'إيدام', 'باميه', 'بامية', 'بطاط', 'مرق لحم', 'مرق دجاج', 'مرق باميه', 'مرق بطاط'],
    visualLock: 'المرق/الصالونة يظهر كطبق مرق أو إيدام واضح في وعاء/صحن مناسب، وليس عيشًا جافًا أو مشويات.',
    avoid: 'لا تحوله إلى طبق عيش رئيسي إلا إذا اسم المنتج يحتوي عيش أيضًا.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'تشريب/ثريد', category: 'stew', categoryLabel: 'طبق تشريب شعبي', heat: 'حار ورطب؛ بخار خفيف',
    keywords: ['تشريب', 'ثريد', 'تشريبة', 'تشريب لحم', 'تشريب دجاج'],
    visualLock: 'التشريب/الثريد طبق شعبي بخبز ومرق وبروتين حسب المنتج. يجب أن يبدو رطبًا وواقعيًا.',
    avoid: 'لا تجعله عيشًا جافًا أو صينية مشاوي.', shotId: 'texture-close', sceneId: 'food-detail', background: 'home-table'
  },
  {
    label: 'جريش/هريس', category: 'stew', categoryLabel: 'طبق شعبي كويتي', heat: 'حار لكن بدون بخار مبالغ',
    keywords: ['جريش', 'هريس', 'هريسة'],
    visualLock: 'الجريش/الهريس قوامه كريمي/مهروس شعبي، يجب أن يبقى كطبق شعبي واضح وليس عيش حبات أو حلى.',
    avoid: 'لا تضف دجاج/لحم ظاهر إذا لم يكن جزءًا من المنتج.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'محاشي وورق عنب', category: 'mahshi', categoryLabel: 'محاشي وورق عنب', heat: 'عادة بدون بخار',
    keywords: ['ورق عنب', 'محشي', 'محاشي', 'كوسا', 'باذنجان', 'فلفل محشي', 'ملفوف'],
    visualLock: 'المحاشي وورق العنب صفوف مرتبة وحبات واضحة، بدون بخار كثيف أو تحويله لمرق/عيش.',
    avoid: 'لا تضف صوصات طائرة أو بخار أو بروتينات غير موجودة.', shotId: 'top-spread', sceneId: 'zowara-spread', background: 'zowara-spread'
  },
  {
    label: 'قبوط/مرقوق', category: 'stew', categoryLabel: 'طبق شعبي بالمرق', heat: 'حار ورطب؛ بخار خفيف',
    keywords: ['قبوط', 'مرقوق', 'مطبق قبوط'],
    visualLock: 'القبوط/المرقوق طبق مرق شعبي بعجين/قطع واضحة داخل مرق، وليس عيشًا أو حلى.',
    avoid: 'لا تجعله باستا أو فطائر أو طبق غربي.', shotId: 'texture-close', sceneId: 'food-detail', background: 'home-table'
  },
  {
    label: 'مشويات', category: 'grill', categoryLabel: 'مشويات', heat: 'حرارة ولمعة خفيفة بدون دخان مبالغ',
    keywords: ['مشوي', 'مشويات', 'كباب', 'تكا', 'شيش', 'ريش', 'دجاج مشوي', 'لحم مشوي'],
    visualLock: 'المشويات تظهر كبروتين مشوي واضح حسب المنتج، مع تحمير واقعي ولمعة خفيفة.',
    avoid: 'لا تضف دخانًا كثيفًا أو نارًا أو شواية مسرحية.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },

  {
    label: 'مشويات مشكلة', category: 'grill', categoryLabel: 'مشويات ومشاوي', heat: 'حرارة ولمعة خفيفة بدون دخان مسرحي',
    keywords: ['أوصال', 'اوصال', 'شيش طاووق', 'كباب دجاج', 'كباب لحم', 'عرايس', 'دجاج على الفحم', 'لحم على الفحم', 'ستيك', 'برجر', 'شاورما'],
    visualLock: 'المشاوي يجب أن تظهر كبروتين مشوي حقيقي حسب اسم المنتج، بتحمير واقعي، بدون نار أو دخان مبالغ.',
    avoid: 'لا تضف سيخ أو بروتين مختلف إذا لم يكن ضمن المنتج، ولا تحولها إلى طبق عيش.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'مقبلات وسلطات', category: 'generic', categoryLabel: 'مقبلات وسلطات', heat: 'بارد أو بدرجة الغرفة؛ بدون بخار',
    keywords: ['سلطه', 'سلطة', 'فتوش', 'تبوله', 'تبولة', 'حمص', 'متبل', 'بابا غنوج', 'روب خيار', 'طرشي', 'مخلل', 'دقوس', 'معجون دقوس', 'صلصه', 'صوص'],
    visualLock: 'المقبلات والسلطات تظهر كأطباق جانبية فقط إذا كانت ضمن المنتج، ببرودة/نظافة واقعية وبدون بخار.',
    avoid: 'لا تجعل الدقوس طبقًا رئيسيًا، ولا تضف أطباق جانبية غير موجودة.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'معجنات ومقليات شعبية', category: 'generic', categoryLabel: 'معجنات ومقليات', heat: 'حارة غالبًا لكن بدون بخار مبالغ',
    keywords: ['سمبوسه', 'سمبوسة', 'سمبوسك', 'كبه', 'كبة', 'فطاير', 'فطائر', 'لقيمات مالحة', 'بقصم', 'سبرنغ رول'],
    visualLock: 'المعجنات والمقليات تظهر كحبات مرتبة ومقرمشة حسب المنتج، وليس كطبق عيش أو مرق.',
    avoid: 'لا تضف حشوات أو صوصات غير موجودة في المنتج.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'فطور كويتي', category: 'generic', categoryLabel: 'فطور كويتي وشعبي', heat: 'حسب الصنف؛ بدون مبالغة',
    keywords: ['بيض طماط', 'بيض بالطماط', 'بيض عيون', 'جبن', 'لبنه', 'لبنة', 'نخي', 'باجلا', 'باجلاء', 'بلاليط', 'خبز رقاق', 'خبز ايراني', 'خبز تنور', 'قيمر', 'عسل'],
    visualLock: 'الفطور الشعبي يظهر كأصناف فطور كويتية بسيطة فقط إذا كانت ضمن منتجات المطعم، بتقديم نظيف وواقعي.',
    avoid: 'لا تضف دلة أو قهوة أو فناجين أو سفرة فطور ضخمة إذا لم تكن المنتجات موجودة.', shotId: 'top-spread', sceneId: 'home-rice-tray', background: 'home-table'
  },
  {
    label: 'حلويات شعبية', category: 'dessert', categoryLabel: 'حلويات', heat: 'بدون بخار',
    keywords: ['حلو', 'حلا', 'حلويات', 'لقيمات', 'درابيل', 'خنفروش', 'رهش', 'بثيث', 'كيك', 'بودنغ', 'كاسترد'],
    visualLock: 'الحلى يظهر كحلى فقط، بتقديم نظيف وإضاءة ناعمة، بدون بخار أو أجواء طبخ حار.',
    avoid: 'لا تضف أطباق عيش أو بروتينات أو بخار.', shotId: 'texture-close', sceneId: 'food-detail', background: 'neutral-menu'
  },
  {
    label: 'بوكس/طلب توصيل', category: 'box', categoryLabel: 'بوكسات وطلبات توصيل', heat: 'حسب الطبق، والأولوية للتغليف',
    keywords: ['بوكس', 'علبه', 'علبة', 'وجبه', 'وجبة', 'توصيل', 'دليفري', 'سفري', 'طلب'],
    visualLock: 'الطلب يظهر كتغليف توصيل مرتب أو علبة مفتوحة حسب المشهد، مع الطعام الحقيقي الموجود فقط.',
    avoid: 'لا تضف أطباقًا جديدة حول العلبة أو ديكور مطعم جلوس.', shotId: 'box-open', sceneId: 'box-reveal', background: 'delivery-packaging'
  },
  {
    label: 'ريوق/فطور شعبي', category: 'generic', categoryLabel: 'فطور شعبي', heat: 'حسب الصنف، بدون مبالغة',
    keywords: ['ريوق', 'فطور', 'نخي', 'باجلا', 'بلاليط', 'خبز ايراني', 'خبز تنور'],
    visualLock: 'الفطور الشعبي يظهر كأصناف فطور كويتية فقط إذا كانت ضمن منتجات المطعم، بتقديم بسيط وواقعي.',
    avoid: 'لا تضف قهوة/دلة/فناجين أو أطباق غير موجودة في القائمة.', shotId: 'top-spread', sceneId: 'home-rice-tray', background: 'home-table'
  }
];

const findKuwaitiDishKnowledge = (value = ''): KuwaitiDishKnowledge | undefined => {
  const text = normalizeArabic(value);
  if (!text) return undefined;
  return KUWAITI_DISH_KNOWLEDGE.find((item) => item.keywords.some((keyword) => text.includes(normalizeArabic(keyword))));
};

const kuwaitiDishKnowledgePrompt = (rawText = '') => {
  const item = findKuwaitiDishKnowledge(rawText);
  if (!item) return '';
  return `Kuwaiti dish dictionary match: ${item.label}. ${item.visualLock} ${item.avoid} Heat logic: ${item.heat}.`;
};

export type AlturathProductGroup = { id: string; label: string; products: ProductLike[] };

const categoryLabelFromText = (value = '') => {
  const knowledge = findKuwaitiDishKnowledge(value);
  if (knowledge) return knowledge.categoryLabel;
  const text = normalizeArabic(value);
  if (includesAny(text, ['عيش', 'رز', 'ارز', 'مجبوس', 'مكبوس', 'مچبوس', 'برياني', 'مربين', 'مربيان', 'مموش', 'معدس', 'كبسه', 'بريه', 'برية'])) return 'أطباق العيش';
  if (includesAny(text, ['مرق', 'صالونه', 'ايدام', 'تشريب', 'باميه', 'بطاط'])) return 'مرق وإيدامات';
  if (includesAny(text, ['محشي', 'محاشي', 'ورق عنب', 'كوسا', 'باذنجان'])) return 'محاشي وورق عنب';
  if (includesAny(text, ['حلو', 'حلا', 'حلويات', 'كيك', 'لقيمات', 'درابيل', 'خنفروش'])) return 'حلويات';
  if (includesAny(text, ['بوكس', 'علبه', 'علبة', 'وجبه', 'وجبة', 'توصيل', 'دليفري'])) return 'بوكسات وطلبات توصيل';
  if (includesAny(text, ['عائله', 'عائلة', 'زواره', 'زوارة', 'صينيه', 'صينية', 'عزيمه', 'عزيمة'])) return 'طلبات عائلية وزوارات';
  if (includesAny(text, ['ديوانيه', 'ديوانية', 'ربع', 'مباراه', 'مباراة'])) return 'طلبات ديوانية';
  if (includesAny(text, ['روبيان', 'ربيان', 'مربيان', 'مربين', 'سمك', 'زبيدي', 'هامور', 'شعري', 'كنعد', 'صبور', 'ميد', 'نقرور', 'بحري'])) return 'أطباق بحرية';
  if (includesAny(text, ['مشوي', 'مشويات', 'كباب', 'تكا', 'ريش'])) return 'مشويات';
  return value ? String(value).trim() : 'منتجات أخرى';
};

export const getAlturathProductCategoryLabel = (product: ProductLike) => {
  const rawCategory = String(product?.category || '').trim();
  if (rawCategory) return categoryLabelFromText(rawCategory);
  return categoryLabelFromText(`${productName(product)} ${String(product?.description || '')}`);
};

export const getAlturathProductGroups = (products: ProductLike[] = []): AlturathProductGroup[] => {
  const map = new Map<string, AlturathProductGroup>();
  products.forEach((product) => {
    const name = productName(product);
    if (!name) return;
    const label = getAlturathProductCategoryLabel(product);
    const id = normalizeArabic(label) || 'other';
    const existing = map.get(id) || { id, label, products: [] };
    existing.products.push(product);
    map.set(id, existing);
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
};

export const getAlturathProductSuggestions = (products: ProductLike[] = [], query = '', limit = 6): string[] => {
  const normalizedQuery = normalizeArabic(query);
  const queryParts = normalizedQuery.split(' ').filter((part) => part.length > 2);
  const ranked = products.map((product, index) => {
    const name = productName(product);
    const normalizedName = normalizeArabic(name);
    const category = normalizeArabic(String(product?.category || ''));
    const description = normalizeArabic(String(product?.description || ''));
    const haystack = `${normalizedName} ${category} ${description}`.trim();
    const productKnowledge = findKuwaitiDishKnowledge(haystack);
    const queryKnowledge = findKuwaitiDishKnowledge(normalizedQuery);
    let score = 1;
    if (queryKnowledge && productKnowledge && queryKnowledge.category === productKnowledge.category) score += 8;
    if (queryKnowledge && queryKnowledge.keywords.some((keyword) => haystack.includes(normalizeArabic(keyword)))) score += 12;
    if (normalizedQuery) {
      if (normalizedName === normalizedQuery) score += 20;
      if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) score += 12;
      score += queryParts.filter((part) => haystack.includes(part)).length * 4;
      if (includesAny(normalizedQuery, ['مجبوس', 'مكبوس', 'عيش', 'رز', 'برياني']) && includesAny(haystack, ['مجبوس', 'مكبوس', 'عيش', 'رز', 'برياني'])) score += 5;
      if (includesAny(normalizedQuery, ['ديوانيه', 'ديوانية', 'عائله', 'عائلة', 'زواره', 'زوارة']) && includesAny(haystack, ['صينيه', 'صينية', 'بوكس', 'عائله', 'عائلة', 'وجبه', 'وجبة'])) score += 3;
    }
    return { name, score, index };
  }).filter((item) => item.name).sort((a, b) => b.score - a.score || a.index - b.index);
  return Array.from(new Set(ranked.map((item) => item.name))).slice(0, limit);
};

const classifyDish = (text: string): { category: AlturathDishCategory; label: string; heat: string } => {
  const knowledge = findKuwaitiDishKnowledge(text);
  if (knowledge) return { category: knowledge.category, label: knowledge.categoryLabel, heat: knowledge.heat };
  if (includesAny(text, ['مجبوس', 'مكبوس', 'مچبوس', 'عيش', 'رز', 'برياني', 'مربين', 'مربيان', 'مموش', 'معدس', 'كبسه', 'بريه', 'برية'])) return { category: 'rice', label: 'طبق عيش رئيسي', heat: 'حار ويقبل بخار خفيف' };
  if (includesAny(text, ['مرق', 'صالونه', 'ايدام', 'باميه', 'بطاط', 'تشريب'])) return { category: 'stew', label: 'مرق/إيدام', heat: 'حار لكن البخار أخف' };
  if (includesAny(text, ['ورق عنب', 'محشي', 'محاشي', 'كوسا', 'باذنجان'])) return { category: 'mahshi', label: 'محاشي أو ورق عنب', heat: 'عادة لا يحتاج بخار' };
  if (includesAny(text, ['حلو', 'حلا', 'كيك', 'لقيمات', 'درابيل', 'خنفروش', 'بودنغ'])) return { category: 'dessert', label: 'حلى', heat: 'بدون بخار' };
  if (includesAny(text, ['بوكس', 'علبه', 'علبة', 'توصيل', 'دليفري', 'طلب'])) return { category: 'box', label: 'طلب توصيل/بوكس', heat: 'حسب الطبق، والأولوية للتغليف' };
  if (includesAny(text, ['ديوانيه', 'ديوانية', 'ربع', 'مباراه', 'شباب'])) return { category: 'diwaniya', label: 'طلب ديوانية', heat: 'حسب الطبق، بدون مبالغة' };
  if (includesAny(text, ['زواره', 'زوارة', 'عزيمه', 'عزيمة', 'يمعه', 'لمة', 'جمعه', 'عائله', 'عائلة'])) return { category: 'family', label: 'طلب عائلي/زوارة', heat: 'حسب الطبق، مع سفرة مرتبة' };
  if (includesAny(text, ['روبيان', 'ربيان', 'مربيان', 'مربين', 'سمك', 'زبيدي', 'هامور', 'شعري', 'كنعد', 'صبور', 'ميد', 'نقرور', 'بحري'])) return { category: 'seafood', label: 'طبق بحري', heat: 'حار إذا كان عيش/مرق، وإلا بدون بخار' };
  if (includesAny(text, ['مشوي', 'كباب', 'تكا', 'شيش', 'ريش'])) return { category: 'grill', label: 'مشويات', heat: 'حرارة ولمعة خفيفة بدون دخان' };
  return { category: 'generic', label: 'فكرة عامة', heat: 'واقعية هادئة بدون مؤثرات زائدة' };
};

export const analyzeAlturathStudioIdea = (rawText = '', products: ProductLike[] = []): AlturathStudioBrainResult => {
  const text = normalizeArabic(rawText);
  const productNames = products.map(productName).filter(Boolean);
  const textParts = text.split(' ').filter((part) => part.length > 2);
  const matchedProducts = productNames.filter((name) => {
    const normalizedName = normalizeArabic(name);
    return Boolean(text) && (
      text.includes(normalizedName) ||
      normalizedName.includes(text) ||
      textParts.some((part) => normalizedName.includes(part))
    );
  }).slice(0, 5);
  const productSuggestions = getAlturathProductSuggestions(products, rawText, 6);
  const national = includesAny(text, ['العيد الوطني', 'وطني', 'الكويت', 'فبراير', 'هلا فبراير']);
  const chalet = includesAny(text, ['شاليه', 'بحر', 'ويكند']);
  const farm = includesAny(text, ['مزرعه', 'مزرعة']);
  const jakhour = includesAny(text, ['جاخور']);
  const detail = includesAny(text, ['تفاصيل', 'قوام', 'قريب', 'قريبه', 'قريبة']);
  const box = includesAny(text, ['علبه', 'علبة', 'بوكس', 'توصيل', 'دليفري', 'طلب']);
  const dish = classifyDish(text);
  const dishKnowledge = findKuwaitiDishKnowledge(text);
  let sceneId = 'delivery-ready'; let pulseId = national ? 'national-day' : 'quick-kuwait'; let place: KuwaitOrderPlace = 'delivery'; let mode: StudioRealityMode = 'finalBoss'; let background: StudioBackgroundPresetId = 'delivery-packaging'; let shotId = 'hero-push'; let mood = national ? 'ناعم' : 'دافئ'; let reason = 'اعتمدنا مشهد توصيل لأنه الخيار الأصدق لمطبخ بدون صالة.';
  if (national) { sceneId = dish.category === 'box' ? 'delivery-ready' : 'home-rice-tray'; place = dish.category === 'box' ? 'delivery' : 'home'; background = dish.category === 'box' ? 'delivery-packaging' : 'home-table'; shotId = 'top-spread'; reason = 'لأن الفكرة مرتبطة بالعيد الوطني، اخترنا تكوينًا كويتيًا هادئًا بلا زينة مبالغ فيها.'; }
  else if (dish.category === 'rice' || dish.category === 'seafood') { sceneId = box ? 'box-reveal' : 'home-rice-tray'; place = box ? 'delivery' : 'home'; background = box ? 'delivery-packaging' : 'home-table'; shotId = detail ? 'texture-close' : 'steam-close'; reason = 'لأنها أكلة عيش رئيسية؛ الأفضل إظهار الطبق بطلًا مع بخار خفيف واقعي إذا كان حارًا.'; }
  else if (dish.category === 'mahshi') { sceneId = 'zowara-spread'; place = 'zowara'; mode = 'menu'; background = 'zowara-spread'; shotId = detail ? 'texture-close' : 'top-spread'; reason = 'لأن ورق العنب والمحاشي ينجحان أكثر بسفرة مرتبة أو لقطة تفاصيل بدون بخار.'; }
  else if (dish.category === 'dessert') { sceneId = 'food-detail'; place = 'delivery'; background = 'neutral-menu'; shotId = 'texture-close'; reason = 'لأن الحلى يحتاج تفاصيل هادئة وإضاءة نظيفة بدون بخار أو مؤثرات حرارة.'; }
  else if (dish.category === 'diwaniya') { sceneId = 'diwaniya-order'; place = 'diwaniya'; mode = 'human'; background = 'diwaniya-table'; shotId = 'table-pass'; reason = 'لأن الفكرة طلب ربع/ديوانية، اخترنا طلبًا جماعيًا مرتبًا بدون وجوه أو ديكور مصطنع.'; }
  else if (dish.category === 'family') { sceneId = 'zowara-spread'; place = 'zowara'; mode = 'menu'; background = 'zowara-spread'; shotId = 'top-spread'; reason = 'لأنها زوارة أو طلب عائلي، الأفضل سفرة مرتبة من الأعلى.'; }
  else if (box) { sceneId = 'box-reveal'; shotId = 'box-open'; reason = 'لأنك ذكرت التوصيل أو العلبة، اخترنا كشف التغليف بدل مشهد مطعم.'; }
  if (dishKnowledge) {
    sceneId = dishKnowledge.sceneId || sceneId;
    shotId = dishKnowledge.shotId || shotId;
    background = dishKnowledge.background || background;
    reason = `لأن المنتج مفهوم كـ ${dishKnowledge.label}، اخترنا تصويرًا يحافظ على هوية الطبق بدون تبديل المكوّنات.`;
  }
  if (chalet) { sceneId = 'chalet-weekend-order'; place = 'chalet'; mode = 'human'; background = 'chalet-spread'; shotId = 'table-pass'; mood = 'غروب'; reason = 'لأن الفكرة شاليه/ويكند، اخترنا طاولة بسيطة وإضاءة طبيعية.'; }
  if (farm) { sceneId = 'farm-clean-table'; place = 'farm'; mode = 'human'; background = 'farm-gathering'; shotId = 'table-pass'; reason = 'لأن الفكرة مزرعة، اخترنا طاولة خارجية نظيفة بدون فوضى أو ديكور زائد.'; }
  if (jakhour) { sceneId = 'jakhour-clean-order'; place = 'jakhour'; mode = 'human'; background = 'jakhour-setup'; shotId = 'table-pass'; reason = 'لأن الفكرة جاخور، اخترنا قعدة عملية نظيفة بدون حيوانات أو تراب أو فوضى.'; }
  if (detail) { sceneId = 'food-detail'; background = 'neutral-menu'; shotId = 'texture-close'; }
  const isKnownProduct = matchedProducts.length > 0; const hasInput = text.length > 0;
  const strictProductOnlyMode = true;
  const isDishLikeRequest = hasInput && dish.category !== 'generic';
  const hasProductCatalog = productNames.length > 0;
  const requiresProductSelection = hasInput && hasProductCatalog && isDishLikeRequest && !isKnownProduct;
  const canGenerate = !requiresProductSelection;
  const primaryProductName = matchedProducts[0] || productSuggestions[0];
  const productGuardMessage = requiresProductSelection
    ? 'هذا الطبق غير موجود ضمن منتجاتك الحالية. اختر منتجًا من قائمتك أو أضفه أولًا.'
    : isKnownProduct
      ? `تم اختيار منتج من قائمتك: ${matchedProducts[0]}.`
      : hasInput && hasProductCatalog
        ? 'الفكرة عامة؛ سأختار الأنسب من كل أصناف مطبخك حسب المناسبة والمشهد.'
        : 'اكتب فكرة أو اختر منتجًا من قائمتك.';
  const warning = requiresProductSelection ? productGuardMessage : hasInput && hasProductCatalog && !isKnownProduct && dish.category === 'generic' ? 'الفكرة عامة. سيختار الاستوديو المنتج الأنسب من أصناف مطبخك.' : undefined;
  const reelRecipe = (() => { if (dish.category === 'rice' || dish.category === 'seafood') return ['فتح علبة أو كشف الطبق بهدوء', 'بخار خفيف جدًا إذا الطبق حار', 'اقتراب على العيش والبروتين بدون تغيير المكونات']; if (dish.category === 'mahshi') return ['لقطة علوية مرتبة', 'اقتراب على القوام والصفّ', 'بدون بخار وبدون صوص متحرك']; if (dish.category === 'dessert') return ['اقتراب ناعم على التفاصيل', 'إضاءة نظيفة', 'بدون بخار أو مؤثرات حرارة']; if (dish.category === 'box') return ['فتح علبة التوصيل', 'إظهار الترتيب والنظافة', 'لقطة قصيرة للشعار أو التغليف إن وجد بدون نصوص داخل الصورة']; return ['حركة كاميرا هادئة', 'طبق ثابت في المنتصف', 'واقعية توصيل بدون مطعم جلوس']; })();
  const variants: AlturathStudioVariant[] = [{ id: 'delivery', title: 'نسخة توصيل', sceneId: dish.category === 'rice' ? 'box-reveal' : 'delivery-ready', shotId: dish.category === 'rice' ? 'box-open' : 'hero-push', desc: 'الأصدق لمطبخ توصيل: علبة/كيس مرتب وكاونتر نظيف.' }, { id: 'home', title: 'نسخة بيتية', sceneId: dish.category === 'mahshi' ? 'zowara-spread' : 'home-rice-tray', shotId: dish.category === 'mahshi' ? 'top-spread' : 'steam-close', desc: 'سفرة بيتية بسيطة للطلب بعد وصوله.' }, { id: 'diwaniya', title: 'نسخة ديوانية', sceneId: 'diwaniya-order', shotId: 'table-pass', desc: 'طلب جماعي للربع بخلفية هادئة وبدون وجوه.' }];
  const lockedProducts = matchedProducts.length ? matchedProducts : productNames.slice(0, 80);
  const promptGuard = [
    'STRICT PRODUCT-ONLY MODE IS ENABLED.',
    `Alturath kitchen brain: understood category = ${dish.label}.`,
    kuwaitiDishKnowledgePrompt(rawText),
    `Use only believable Kuwaiti delivery-kitchen food presentation. Keep the exact requested idea visible in planning: ${rawText || 'no custom text'}.`,
    lockedProducts.length
      ? `Allowed real menu items from the full current catalog only: ${lockedProducts.join('، ')}. The generated food must match one of these actual products only.`
      : 'No verified menu item is available in the current product list; do not invent any named dish or visible extra menu item.',
    isKnownProduct
      ? `Primary locked product: ${matchedProducts[0]}. Do not add side dishes, proteins, desserts, sauces, or menu items that are not already part of this product.`
      : 'If the user idea is only an occasion or mood, choose a believable composition using the allowed real menu items only; never create a new dish name.',
    `Recommended scene: ${sceneId}; shot: ${shotId}; heat logic: ${dish.heat}.`,
    'If a Kuwaiti dish word appears in the product name (for example zubaidi fish, mutabbaq zubaidi, biryat meat, biryat chicken, machboos, majboos fish, murabyan shrimp, hammour, sheri, kanaad, saboor, maid, margoog, qaboot, tashreeb, jireesh, harees, mumawash, grills, Kuwaiti breakfast), preserve its exact Kuwaiti food identity and never reinterpret it as a generic dish.',
    'Ultra-realistic only: natural shadows, normal table/packaging, no perfect CGI shine, no exaggerated steam, no extra heritage props.',
    'Forbidden: invented dishes, extra plates not in the menu, fake restaurant dine-in setup, luxury props, fantasy garnish, impossible steam, changing the product identity, crosses, cross-shaped objects, crucifix, statues, idols, figurines, religious icons, shrine-like decor, or worship symbols.'
  ].filter(Boolean).join(' ');
  const confidence = hasInput ? Math.min(96, 70 + (isKnownProduct ? 12 : 0) + (dish.category !== 'generic' ? 10 : 0) + (national ? 4 : 0)) : 62;
  return { hasInput, normalizedText: text, productNames, matchedProducts, isKnownProduct, category: dish.category, categoryLabel: dish.label, heatLabel: dish.heat, sceneId, pulseId, place, mode, background, shotId, mood, reason, confidence, warning, strictProductOnlyMode, canGenerate, requiresProductSelection, primaryProductName, productGuardMessage, productSuggestions, reelRecipe, variants, promptGuard };
};
