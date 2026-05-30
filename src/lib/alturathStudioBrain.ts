import type { KuwaitOrderPlace } from './kuwaitContentPulse';
import type { StudioBackgroundPresetId, StudioRealityMode } from './studioReality';

type ProductLike = { id?: string; name?: string; title?: string; category?: string; description?: string };
export type AlturathDishCategory = 'rice' | 'stew' | 'mahshi' | 'dessert' | 'box' | 'family' | 'diwaniya' | 'seafood' | 'grill' | 'generic';
export type AlturathStudioVariant = { id: 'delivery' | 'home' | 'diwaniya'; title: string; sceneId: string; shotId: string; desc: string };
export type AlturathStudioBrainResult = {
  hasInput: boolean; normalizedText: string; productNames: string[]; matchedProducts: string[]; isKnownProduct: boolean;
  category: AlturathDishCategory; categoryLabel: string; heatLabel: string; sceneId: string; pulseId: string;
  place: KuwaitOrderPlace; mode: StudioRealityMode; background: StudioBackgroundPresetId; shotId: string; mood: string;
  reason: string; confidence: number; warning?: string; reelRecipe: string[]; variants: AlturathStudioVariant[]; promptGuard: string;
};

const normalizeArabic = (value: string) => String(value || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(normalizeArabic(word)));
const productName = (product: ProductLike) => String(product?.name || product?.title || '').trim();

export const getAlturathProductSuggestions = (products: ProductLike[] = [], query = '', limit = 6): string[] => {
  const names = products.map(productName).filter(Boolean);
  const normalizedQuery = normalizeArabic(query);
  const ranked = names.map((name) => {
    const normalizedName = normalizeArabic(name);
    const score = !normalizedQuery ? 1 : normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName) ? 4 : normalizedQuery.split(' ').some((part) => part.length > 2 && normalizedName.includes(part)) ? 2 : 1;
    return { name, score };
  }).sort((a, b) => b.score - a.score);
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
  const matchedProducts = productNames.filter((name) => {
    const normalizedName = normalizeArabic(name);
    return Boolean(text) && (text.includes(normalizedName) || normalizedName.includes(text) || text.split(' ').some((part) => part.length > 2 && normalizedName.includes(part)));
  }).slice(0, 5);
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
  const warning = hasInput && productNames.length > 0 && !isKnownProduct && dish.category === 'generic' ? 'هذا الطلب غير واضح ضمن منتجات المطعم. سيُعامل كفكرة عامة فقط، والأفضل اختيار منتج فعلي حتى لا يخترع النظام طبقًا غير موجود.' : undefined;
  const reelRecipe = (() => { if (dish.category === 'rice' || dish.category === 'seafood') return ['فتح علبة أو كشف الطبق بهدوء', 'بخار خفيف جدًا إذا الطبق حار', 'اقتراب على العيش والبروتين بدون تغيير المكونات']; if (dish.category === 'mahshi') return ['لقطة علوية مرتبة', 'اقتراب على القوام والصفّ', 'بدون بخار وبدون صوص متحرك']; if (dish.category === 'dessert') return ['اقتراب ناعم على التفاصيل', 'إضاءة نظيفة', 'بدون بخار أو مؤثرات حرارة']; if (dish.category === 'box') return ['فتح علبة التوصيل', 'إظهار الترتيب والنظافة', 'لقطة قصيرة للشعار أو التغليف إن وجد بدون نصوص داخل الصورة']; return ['حركة كاميرا هادئة', 'طبق ثابت في المنتصف', 'واقعية توصيل بدون مطعم جلوس']; })();
  const variants: AlturathStudioVariant[] = [{ id: 'delivery', title: 'نسخة توصيل', sceneId: dish.category === 'rice' ? 'box-reveal' : 'delivery-ready', shotId: dish.category === 'rice' ? 'box-open' : 'hero-push', desc: 'الأصدق لمطبخ توصيل: علبة/كيس مرتب وكاونتر نظيف.' }, { id: 'home', title: 'نسخة بيتية', sceneId: dish.category === 'mahshi' ? 'zowara-spread' : 'home-rice-tray', shotId: dish.category === 'mahshi' ? 'top-spread' : 'steam-close', desc: 'سفرة بيتية بسيطة للطلب بعد وصوله.' }, { id: 'diwaniya', title: 'نسخة ديوانية', sceneId: 'diwaniya-order', shotId: 'table-pass', desc: 'طلب جماعي للربع بخلفية هادئة وبدون وجوه.' }];
  const promptGuard = [`Alturath kitchen brain: understood category = ${dish.label}.`, `Use only believable Kuwaiti delivery-kitchen food presentation. Keep the exact requested idea visible in planning: ${rawText || 'no custom text'}.`, isKnownProduct ? `Prefer these actual menu items if relevant: ${matchedProducts.join('، ')}.` : 'Do not invent unavailable dishes; if the dish is not clear, keep it generic and realistic.', `Recommended scene: ${sceneId}; shot: ${shotId}; heat logic: ${dish.heat}.`, 'Ultra-realistic only: natural shadows, normal table/packaging, no perfect CGI shine, no exaggerated steam, no extra heritage props.'].join(' ');
  const confidence = hasInput ? Math.min(96, 70 + (isKnownProduct ? 12 : 0) + (dish.category !== 'generic' ? 10 : 0) + (national ? 4 : 0)) : 62;
  return { hasInput, normalizedText: text, productNames, matchedProducts, isKnownProduct, category: dish.category, categoryLabel: dish.label, heatLabel: dish.heat, sceneId, pulseId, place, mode, background, shotId, mood, reason, confidence, warning, reelRecipe, variants, promptGuard };
};
