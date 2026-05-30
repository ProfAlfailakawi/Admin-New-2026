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

export type AlturathProductGroup = { id: string; label: string; products: ProductLike[] };

const categoryLabelFromText = (value = '') => {
  const text = normalizeArabic(value);
  if (includesAny(text, ['عيش', 'رز', 'ارز', 'مجبوس', 'مكبوس', 'برياني', 'مربين', 'كبسه'])) return 'أطباق العيش';
  if (includesAny(text, ['مرق', 'صالونه', 'ايدام', 'تشريب', 'باميه', 'بطاط'])) return 'مرق وإيدامات';
  if (includesAny(text, ['محشي', 'محاشي', 'ورق عنب', 'كوسا', 'باذنجان'])) return 'محاشي وورق عنب';
  if (includesAny(text, ['حلو', 'حلا', 'حلويات', 'كيك', 'لقيمات', 'درابيل', 'خنفروش'])) return 'حلويات';
  if (includesAny(text, ['بوكس', 'علبه', 'علبة', 'وجبه', 'وجبة', 'توصيل', 'دليفري'])) return 'بوكسات وطلبات توصيل';
  if (includesAny(text, ['عائله', 'عائلة', 'زواره', 'زوارة', 'صينيه', 'صينية', 'عزيمه', 'عزيمة'])) return 'طلبات عائلية وزوارات';
  if (includesAny(text, ['ديوانيه', 'ديوانية', 'ربع', 'مباراه', 'مباراة'])) return 'طلبات ديوانية';
  if (includesAny(text, ['روبيان', 'سمك', 'زبيدي', 'هامور', 'بحري'])) return 'أطباق بحرية';
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
    let score = 1;
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
  if (includesAny(text, ['مجبوس', 'مكبوس', 'مچبوس', 'عيش', 'رز', 'برياني', 'مربين', 'كبسه'])) return { category: 'rice', label: 'طبق عيش رئيسي', heat: 'حار ويقبل بخار خفيف' };
  if (includesAny(text, ['مرق', 'صالونه', 'ايدام', 'باميه', 'بطاط', 'تشريب'])) return { category: 'stew', label: 'مرق/إيدام', heat: 'حار لكن البخار أخف' };
  if (includesAny(text, ['ورق عنب', 'محشي', 'محاشي', 'كوسا', 'باذنجان'])) return { category: 'mahshi', label: 'محاشي أو ورق عنب', heat: 'عادة لا يحتاج بخار' };
  if (includesAny(text, ['حلو', 'حلا', 'كيك', 'لقيمات', 'درابيل', 'خنفروش', 'بودنغ'])) return { category: 'dessert', label: 'حلى', heat: 'بدون بخار' };
  if (includesAny(text, ['بوكس', 'علبه', 'علبة', 'توصيل', 'دليفري', 'طلب'])) return { category: 'box', label: 'طلب توصيل/بوكس', heat: 'حسب الطبق، والأولوية للتغليف' };
  if (includesAny(text, ['ديوانيه', 'ديوانية', 'ربع', 'مباراه', 'شباب'])) return { category: 'diwaniya', label: 'طلب ديوانية', heat: 'حسب الطبق، بدون مبالغة' };
  if (includesAny(text, ['زواره', 'زوارة', 'عزيمه', 'عزيمة', 'يمعه', 'لمة', 'جمعه', 'عائله', 'عائلة'])) return { category: 'family', label: 'طلب عائلي/زوارة', heat: 'حسب الطبق، مع سفرة مرتبة' };
  if (includesAny(text, ['روبيان', 'سمك', 'زبيدي', 'هامور', 'بحري'])) return { category: 'seafood', label: 'طبق بحري', heat: 'حار إذا كان عيش/مرق، وإلا بدون بخار' };
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
  let sceneId = 'delivery-ready'; let pulseId = national ? 'national-day' : 'quick-kuwait'; let place: KuwaitOrderPlace = 'delivery'; let mode: StudioRealityMode = 'finalBoss'; let background: StudioBackgroundPresetId = 'delivery-packaging'; let shotId = 'hero-push'; let mood = national ? 'ناعم' : 'دافئ'; let reason = 'اعتمدنا مشهد توصيل لأنه الخيار الأصدق لمطبخ بدون صالة.';
  if (national) { sceneId = dish.category === 'box' ? 'delivery-ready' : 'home-rice-tray'; place = dish.category === 'box' ? 'delivery' : 'home'; background = dish.category === 'box' ? 'delivery-packaging' : 'home-table'; shotId = 'top-spread'; reason = 'لأن الفكرة مرتبطة بالعيد الوطني، اخترنا تكوينًا كويتيًا هادئًا بلا زينة مبالغ فيها.'; }
  else if (dish.category === 'rice' || dish.category === 'seafood') { sceneId = box ? 'box-reveal' : 'home-rice-tray'; place = box ? 'delivery' : 'home'; background = box ? 'delivery-packaging' : 'home-table'; shotId = detail ? 'texture-close' : 'steam-close'; reason = 'لأنها أكلة عيش رئيسية؛ الأفضل إظهار الطبق بطلًا مع بخار خفيف واقعي إذا كان حارًا.'; }
  else if (dish.category === 'mahshi') { sceneId = 'zowara-spread'; place = 'zowara'; mode = 'menu'; background = 'zowara-spread'; shotId = detail ? 'texture-close' : 'top-spread'; reason = 'لأن ورق العنب والمحاشي ينجحان أكثر بسفرة مرتبة أو لقطة تفاصيل بدون بخار.'; }
  else if (dish.category === 'dessert') { sceneId = 'food-detail'; place = 'delivery'; background = 'neutral-menu'; shotId = 'texture-close'; reason = 'لأن الحلى يحتاج تفاصيل هادئة وإضاءة نظيفة بدون بخار أو مؤثرات حرارة.'; }
  else if (dish.category === 'diwaniya') { sceneId = 'diwaniya-order'; place = 'diwaniya'; mode = 'human'; background = 'diwaniya-table'; shotId = 'table-pass'; reason = 'لأن الفكرة طلب ربع/ديوانية، اخترنا طلبًا جماعيًا مرتبًا بدون وجوه أو ديكور مصطنع.'; }
  else if (dish.category === 'family') { sceneId = 'zowara-spread'; place = 'zowara'; mode = 'menu'; background = 'zowara-spread'; shotId = 'top-spread'; reason = 'لأنها زوارة أو طلب عائلي، الأفضل سفرة مرتبة من الأعلى.'; }
  else if (box) { sceneId = 'box-reveal'; shotId = 'box-open'; reason = 'لأنك ذكرت التوصيل أو العلبة، اخترنا كشف التغليف بدل مشهد مطعم.'; }
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
    ? 'هذا الطبق غير موجود ضمن منتجاتك الحالية. اختر منتجًا من القائمة أو أضفه أولًا. لن يتم التوليد حتى لا يخترع الاستوديو طبقًا غير موجود.'
    : isKnownProduct
      ? `تم قفل التوليد على منتج فعلي من قائمتك: ${matchedProducts[0]}. لن نضيف طبقًا أو مكونًا خارج المنتج.`
      : hasInput && hasProductCatalog
        ? 'الفكرة عامة وليست طبقًا محددًا؛ سيتم استخدام منتجاتك الفعلية فقط من القائمة، بدون اختراع أصناف جديدة.'
        : 'اكتب فكرة أو اختر منتجًا من القائمة؛ وضع المنتجات الفعلية فقط مفعّل دائمًا.';
  const warning = requiresProductSelection ? productGuardMessage : hasInput && hasProductCatalog && !isKnownProduct && dish.category === 'generic' ? 'الفكرة عامة. سيختار الاستوديو من منتجاتك الفعلية فقط ولن يخترع طبقًا جديدًا.' : undefined;
  const reelRecipe = (() => { if (dish.category === 'rice' || dish.category === 'seafood') return ['فتح علبة أو كشف الطبق بهدوء', 'بخار خفيف جدًا إذا الطبق حار', 'اقتراب على العيش والبروتين بدون تغيير المكونات']; if (dish.category === 'mahshi') return ['لقطة علوية مرتبة', 'اقتراب على القوام والصفّ', 'بدون بخار وبدون صوص متحرك']; if (dish.category === 'dessert') return ['اقتراب ناعم على التفاصيل', 'إضاءة نظيفة', 'بدون بخار أو مؤثرات حرارة']; if (dish.category === 'box') return ['فتح علبة التوصيل', 'إظهار الترتيب والنظافة', 'لقطة قصيرة للشعار أو التغليف إن وجد بدون نصوص داخل الصورة']; return ['حركة كاميرا هادئة', 'طبق ثابت في المنتصف', 'واقعية توصيل بدون مطعم جلوس']; })();
  const variants: AlturathStudioVariant[] = [{ id: 'delivery', title: 'نسخة توصيل', sceneId: dish.category === 'rice' ? 'box-reveal' : 'delivery-ready', shotId: dish.category === 'rice' ? 'box-open' : 'hero-push', desc: 'الأصدق لمطبخ توصيل: علبة/كيس مرتب وكاونتر نظيف.' }, { id: 'home', title: 'نسخة بيتية', sceneId: dish.category === 'mahshi' ? 'zowara-spread' : 'home-rice-tray', shotId: dish.category === 'mahshi' ? 'top-spread' : 'steam-close', desc: 'سفرة بيتية بسيطة للطلب بعد وصوله.' }, { id: 'diwaniya', title: 'نسخة ديوانية', sceneId: 'diwaniya-order', shotId: 'table-pass', desc: 'طلب جماعي للربع بخلفية هادئة وبدون وجوه.' }];
  const lockedProducts = matchedProducts.length ? matchedProducts : productSuggestions;
  const promptGuard = [
    'STRICT PRODUCT-ONLY MODE IS ENABLED.',
    `Alturath kitchen brain: understood category = ${dish.label}.`,
    `Use only believable Kuwaiti delivery-kitchen food presentation. Keep the exact requested idea visible in planning: ${rawText || 'no custom text'}.`,
    lockedProducts.length
      ? `Allowed real menu items only: ${lockedProducts.join('، ')}. The generated food must match one of these actual products only.`
      : 'No verified menu item is available in the current product list; do not invent any named dish or visible extra menu item.',
    isKnownProduct
      ? `Primary locked product: ${matchedProducts[0]}. Do not add side dishes, proteins, desserts, sauces, or menu items that are not already part of this product.`
      : 'If the user idea is only an occasion or mood, choose a believable composition using the allowed real menu items only; never create a new dish name.',
    `Recommended scene: ${sceneId}; shot: ${shotId}; heat logic: ${dish.heat}.`,
    'Ultra-realistic only: natural shadows, normal table/packaging, no perfect CGI shine, no exaggerated steam, no extra heritage props.',
    'Forbidden: invented dishes, extra plates not in the menu, fake restaurant dine-in setup, luxury props, fantasy garnish, impossible steam, or changing the product identity.'
  ].join(' ');
  const confidence = hasInput ? Math.min(96, 70 + (isKnownProduct ? 12 : 0) + (dish.category !== 'generic' ? 10 : 0) + (national ? 4 : 0)) : 62;
  return { hasInput, normalizedText: text, productNames, matchedProducts, isKnownProduct, category: dish.category, categoryLabel: dish.label, heatLabel: dish.heat, sceneId, pulseId, place, mode, background, shotId, mood, reason, confidence, warning, strictProductOnlyMode, canGenerate, requiresProductSelection, primaryProductName, productGuardMessage, productSuggestions, reelRecipe, variants, promptGuard };
};
