import type { StudioBackgroundPresetId, StudioRealityMode } from './studioReality';

export type KuwaitContentGoal = 'post' | 'story' | 'whatsapp' | 'campaign' | 'product';
export type KuwaitOrderPlace = 'home' | 'diwaniya' | 'chalet' | 'farm' | 'jakhour' | 'zowara' | 'delivery';

export type KuwaitPulsePack = {
  id: string;
  label: string;
  badge: string;
  icon: string;
  category: 'national' | 'gathering' | 'season' | 'daily';
  tone: string;
  defaultPlace: KuwaitOrderPlace;
  mode: StudioRealityMode;
  background: StudioBackgroundPresetId;
  prompt: string;
  captionSeed: string;
  whatsappSeed: string;
};

export const KUWAIT_PLACES: Record<KuwaitOrderPlace, { label: string; icon: string; prompt: string; background: StudioBackgroundPresetId }> = {
  home: { label: 'بيت', icon: '🏠', background: 'home-table', prompt: 'سفرة بيتية كويتية عادية ومرتبة: طبق أو صينية من المطبخ على طاولة نظيفة، ضوء طبيعي أو دافئ، بدون مطعم جلوس وبدون قهوة أو دلة أو بخور أو ديكور مصطنع.' },
  diwaniya: { label: 'ديوانية', icon: '🛋️', background: 'diwaniya-table', prompt: 'ديوانية كويتية عصرية بخلفية blur: طلب جماعي للربع، سفرة/علب مرتبة، بدون وجوه واضحة، بدون دخان، بدون سدو أو بخور أو دلة أو ديكور تراثي زائد.' },
  chalet: { label: 'شاليه', icon: '🌊', background: 'chalet-spread', prompt: 'طلب شاليه كويتي واقعي للويكند: طاولة بسيطة، إضاءة نهارية أو غروب ناعم، طلبات مرتبة، بدون ناس واضحة أو بحر مبالغ أو مشهد سياحي مصطنع.' },
  farm: { label: 'مزرعة', icon: '🌴', background: 'farm-gathering', prompt: 'مزرعة كويتية نظيفة وهادئة: طاولة خارجية تحت ظل طبيعي، طلب جماعي مرتب، بدون خيام تراثية أو زخارف مصطنعة أو فوضى.' },
  jakhour: { label: 'جاخور', icon: '🐪', background: 'jakhour-setup', prompt: 'جاخور كويتي مرتب وحذر: طاولة عملية نظيفة، طلب للربع، خلفية بسيطة blur، بدون حيوانات أو تراب أو مخلفات أو فوضى أو ديكور مبالغ.' },
  zowara: { label: 'زوارة', icon: '👨‍👩‍👧‍👦', background: 'zowara-spread', prompt: 'زوارة كويتية داخل بيت: سفرة عائلية مرتبة، محاشي/ورق عنب/عيوش أو أطباق جاهزة للتقديم، بدون وجوه واضحة أو عرس أو قهوة أو دلة.' },
  delivery: { label: 'توصيل', icon: '🚗', background: 'delivery-packaging', prompt: 'مشهد طلب جاهز للتوصيل وهو الافتراضي: علب plain مرتبة وكيس plain على كاونتر أو طاولة نظيفة، إحساس مطبخ وطلبات بيتية، بدون سيارة أو سائق أو شعارات أو مطعم جلوس.' }
};

export const KUWAIT_CONTENT_GOALS: Record<KuwaitContentGoal, { label: string; icon: string; prompt: string }> = {
  post: { label: 'كابشن اختياري', icon: '▣', prompt: 'المخرجات نص قصير يمكن استخدامه لاحقاً إذا احتاجوا، لكن واتساب هو الأساس.' },
  story: { label: 'ستوري', icon: '▯', prompt: 'المخرجات مناسبة لستوري سريع مع مساحة آمنة للنص لاحقاً.' },
  whatsapp: { label: 'واتساب', icon: '☏', prompt: 'اكتب نبرة واتساب قصيرة ومقنعة بدون إطالة أو ضغط مزعج.' },
  campaign: { label: 'حملة كاملة', icon: '✦', prompt: 'فكر كحزمة حملة: صورة، كابشن، واتساب، ونداء طلب واضح.' },
  product: { label: 'صورة منتج', icon: '◎', prompt: 'ركز على إبراز المنتج نفسه مع خلفية كويتية واقعية وهادئة.' }
};

export const KUWAIT_PULSE_PACKS: KuwaitPulsePack[] = [
  {
    id: 'quick-kuwait', label: 'طلب توصيل جاهز', badge: 'افتراضي', icon: '📦', category: 'daily', tone: 'كويتي خفيف وواضح', defaultPlace: 'delivery', mode: 'finalBoss', background: 'delivery-packaging',
    prompt: 'طلب كويتي منزلي جاهز للتوصيل، واقعي جداً، مرتب، مناسب للبيت والديوانية والشاليه، بدون أي إحساس مطعم جلوس.',
    captionSeed: 'طلب توصيل مرتب يوصل وين ما تكون.', whatsappSeed: 'طلبك جاهز لليوم؟ نوصل للبيت والديوانية والشاليه بكل ترتيب.'
  },
  {
    id: 'national-day', label: 'العيد الوطني', badge: 'وطني', icon: '🇰🇼', category: 'national', tone: 'فرح كويتي راقٍ', defaultPlace: 'home', mode: 'finalBoss', background: 'home-table',
    prompt: 'أجواء وطنية كويتية ناعمة وراقية حول طلب منزلي/يمعة، بدون أعلام مشوهة أو نص داخل الصورة، بدون دلة أو بخور أو سدو، إحساس فرحة الكويت واللمة.',
    captionSeed: 'فرحة الكويت تكمل باليمعة والطلب اللي يبيض الوجه.', whatsappSeed: 'بمناسبة العيد الوطني، جهز يمعتك وخلي الطلب علينا 🇰🇼'
  },
  {
    id: 'kuwait-win', label: 'فوز المنتخب', badge: 'حماس', icon: '🏆', category: 'national', tone: 'حماسي محترم', defaultPlace: 'diwaniya', mode: 'finalBoss', background: 'diwaniya-table',
    prompt: 'مشهد فوز المنتخب الكويتي كأجواء ديوانية أو بيتية واقعية حول طلب جماعي، حماس ولمة بدون كتابة داخل الصورة وبدون أعلام مشوهة، التركيز على الأكل واليمعة.',
    captionSeed: 'الفوز له طعم ثاني… واليمعة ما تكمل إلا بطلب يبيض الوجه.', whatsappSeed: 'مبروك الفوز! جهز الربع وخلي الطلب علينا للديواينة أو البيت.'
  },
  {
    id: 'diwaniya-night', label: 'ديوانية', badge: 'يمعة ربع', icon: '🛋️', category: 'gathering', tone: 'كويتي ديواني', defaultPlace: 'diwaniya', mode: 'human', background: 'diwaniya-table',
    prompt: 'طلب ديوانية واقعي للربع، سفرة مرتبة، إضاءة دافئة، زاوية بشرية غير مثالية، بدون أي ديكور تراثي مصطنع.',
    captionSeed: 'الديوانية تحلى بالطلب المرتب واليمعة الطيبة.', whatsappSeed: 'حق الديوانية اليوم؟ نجهز لكم الطلب مرتب ويوصل بالوقت.'
  },
  {
    id: 'chalet-weekend', label: 'شاليه الويكند', badge: 'طلعة', icon: '🌊', category: 'gathering', tone: 'وناسة وويكند', defaultPlace: 'chalet', mode: 'human', background: 'chalet-spread',
    prompt: 'طلب شاليه كويتي للويكند، أجواء بحر ويمعة، واقعي ومريح، بدون مبالغة أو مطعم.',
    captionSeed: 'الشاليه يحتاج طلب يضبط اليمعة من أولها.', whatsappSeed: 'رايحين الشاليه؟ اطلبوا قبل الزحمة ونوصل لكم الطلب مرتب.'
  },
  {
    id: 'zowara-family', label: 'زوارة', badge: 'أهل', icon: '👨‍👩‍👧‍👦', category: 'gathering', tone: 'عائلي دافئ', defaultPlace: 'zowara', mode: 'menu', background: 'zowara-spread',
    prompt: 'زوارة كويتية عائلية دافئة، سفرة بيتية مرتبة، طلب جاهز للتقديم، فخامة هادئة وواقعية.',
    captionSeed: 'الزوارة لها قدرها… والطلب المرتب يختصر عليك التعب.', whatsappSeed: 'حق الزوارة؟ نجهز لكم طلب مرتب ويبيض الوجه.'
  },
  {
    id: 'rain-cold', label: 'مطر وبرد', badge: 'موسم', icon: '🌧️', category: 'season', tone: 'دافئ وهادئ', defaultPlace: 'home', mode: 'finalBoss', background: 'home-table',
    prompt: 'أجواء مطر وبرد في الكويت داخل بيت حقيقي، طلب دافئ على سفرة منزلية، إضاءة ناعمة، بدون كافيه أو قهوة أو دلة.',
    captionSeed: 'مع هالجو… الطلب الدافي له حسبة ثانية.', whatsappSeed: 'الجو يطلب أكلة دافية. نجهز لكم الطلب للبيت أو الديوانية.'
  },
  {
    id: 'ramadan', label: 'رمضان', badge: 'موسمي', icon: '🌙', category: 'season', tone: 'رمضاني محترم', defaultPlace: 'home', mode: 'menu', background: 'home-table',
    prompt: 'طلب رمضاني كويتي على سفرة بيتية واقعية، هدوء وفخامة بسيطة، بدون فوانيس أو زخارف مزيفة أو دلة أو بخور.',
    captionSeed: 'سفرة رمضان تكمل بالطلب اللي يرضي الكل.', whatsappSeed: 'جهز سفرة رمضان بدون تعب، طلب مرتب ويوصل بالوقت.'
  },
  {
    id: 'eid-adha', label: 'عيد الأضحى', badge: 'عيدكم مبارك', icon: '🐏', category: 'season', tone: 'تهنئة كويتية راقية', defaultPlace: 'zowara', mode: 'finalBoss', background: 'zowara-spread',
    prompt: 'أجواء عيد أضحى كويتية بيتية راقية، زوارة ولمة أهل وطلب جاهز للتقديم، بدون مشاهد ذبح، بدون مبالغة، بدون نص داخل الصورة، فخامة هادئة وواقعية.',
    captionSeed: 'عيد الأضحى يحلى باللمة والطلب اللي يبيض الوجه.', whatsappSeed: 'عيدكم مبارك 🌙 جهزوا اليمعة وخلو الطلب علينا، نوصل للبيت والديوانية والشاليه بكل ترتيب.'
  },
  {
    id: 'eid-fitr', label: 'عيد الفطر', badge: 'فرحة العيد', icon: '✨', category: 'season', tone: 'فرحة عائلية دافئة', defaultPlace: 'home', mode: 'finalBoss', background: 'home-table',
    prompt: 'أجواء عيد فطر كويتية داخل بيت حقيقي، سفرة مرتبة ولمة أهل، بدون فوانيس أو ديكور مصطنع أو نصوص داخل الصورة.',
    captionSeed: 'فرحة العيد تكمل باليمعة والطلب المرتب.', whatsappSeed: 'عيدكم مبارك ✨ نجهز لكم الطلب للبيت أو الزوارة بدون تعب.'
  },
  {
    id: 'match-night', label: 'مباراة اليوم', badge: 'ديوانية', icon: '⚽', category: 'national', tone: 'حماس ديوانية', defaultPlace: 'diwaniya', mode: 'human', background: 'diwaniya-table',
    prompt: 'ليلة مباراة في ديوانية كويتية عصرية، طلب جماعي مرتب، حماس ولمة بدون شاشات بنصوص واضحة أو شعارات مشوهة، صورة بشرية واقعية.',
    captionSeed: 'المباراة تحلى بالربع والطلب اللي يضبط اليمعة.', whatsappSeed: 'حق مباراة اليوم؟ جهزوا الربع ونوصل لكم الطلب مرتب للديواينة.'
  },
  {
    id: 'weekend', label: 'الويكند', badge: 'راحة', icon: '🗓️', category: 'daily', tone: 'خفيف وعملي', defaultPlace: 'chalet', mode: 'human', background: 'chalet-spread',
    prompt: 'أجواء ويكند كويتية بسيطة، شاليه أو بيت أو ديوانية، طلبات مرتبة وواقعية، بدون مطعم وبدون ديكور مبالغ.',
    captionSeed: 'الويكند يبيله طلب يضبط الجو.', whatsappSeed: 'الويكند وصل، اطلبوا قبل الزحمة ونجهز لكم الطلب وين ما تكونون.'
  },
  {
    id: 'eid', label: 'العيد العام', badge: 'فرحة', icon: '🎉', category: 'season', tone: 'فرحة عائلية', defaultPlace: 'zowara', mode: 'finalBoss', background: 'zowara-spread',
    prompt: 'أجواء عيد كويتي بيتية، زوارة ولمة، طلبات مرتبة للتقديم، فرحة ناعمة بدون مبالغة أو ديكور مصطنع.',
    captionSeed: 'العيد يحلى باللمة والطلب اللي يبيض الوجه.', whatsappSeed: 'عيدكم مبارك، جهزوا اليمعة وخلو الطلب علينا.'
  }
];

export const getKuwaitPulsePack = (id: string) => KUWAIT_PULSE_PACKS.find((pack) => pack.id === id) || KUWAIT_PULSE_PACKS[0];

export const buildKuwaitStudioTheme = ({ packId, place, goal, customText, products }: { packId: string; place: KuwaitOrderPlace; goal: KuwaitContentGoal; customText?: string, products?: any[] }) => {
  const pack = getKuwaitPulsePack(packId);
  const placeInfo = KUWAIT_PLACES[place || pack.defaultPlace];
  const goalInfo = KUWAIT_CONTENT_GOALS[goal || 'post'];
  const userText = String(customText || '').trim();
  // قم بتجهيز قائمة أسماء المنتجات بطريقة آمنة وموحدة
  const productNames: string[] = Array.isArray(products)
    ? products.map((p: any) => p?.name).filter(Boolean)
    : [];
  const productContext = productNames.length > 0
    ? `AVAILABLE PRODUCTS (ONLY USE THESE): ${productNames.join(', ')}`
    : '';
  // استخدم خلاصة التصنيفات من دماغ التراث لشرح أنواع الأطباق الموجودة في المنيو
  // يمنح هذا الخيط النموذج فهماً أفضل لخصائص الأطباق دون اختراع أطباق غير موجودة.
  let menuCategoryContext = '';
  try {
    // الاستيراد هنا لتجنب حلقة الواردات الدائرية في بعض البيئات
    const { summarizeMenuCategories, buildAdvancedMenuContext } = require('./alturathStudioBrain');
    if (productNames.length > 0) {
      menuCategoryContext = [
        summarizeMenuCategories(productNames),
        buildAdvancedMenuContext(productNames, userText, `${pack.label} - ${placeInfo.label}`)
      ].filter(Boolean).join(' ');
    }
  } catch (_err) {
    menuCategoryContext = '';
  }

  return [
    'KUWAIT CONTENT PULSE LAYER: This is not a dine-in restaurant scene. It is a Kuwaiti home-order and delivery brand for homes, diwaniyas, chalets, farms, jakhours, zowaras, and gatherings.',
    'STRICT RULE: Only use products found in the database. Do not invent items like "travel boxes" or "boxes of travel" (بوكسات السفر) if they are not in the products list.',
    productContext,
    `Occasion + place must be merged into one believable Kuwaiti moment: ${pack.label} at ${placeInfo.label}. Tone: ${pack.tone}. ${placeInfo.prompt}`,
    `Scene + environment must stay consistent together: ${pack.prompt} Environment: ${placeInfo.prompt}`,
    `Content goal: ${goalInfo.label}. ${goalInfo.prompt}`,
    `Scene direction: ${pack.prompt}`,
    userText ? `User custom idea (STRICTLY ground it in existing products): ${userText}` : '',
    // فقرة إضافية تلخص فئات قائمة المنتجات وتعطي إرشادات عامة لتفاصيل التصوير حسب الأطباق
    menuCategoryContext ? `Menu context: ${menuCategoryContext}` : '',
    'Keep the current fast realistic generation style. Make it human-photographed in Kuwait, not a restaurant ad, not a cafe, and not fake heritage decor.',
    'FINAL PRIORITY ORDER: dish identity first, realism second, delivery/menu suitability third, product clarity fourth, beauty fifth, creativity last.',
    'NO FOREIGN CUISINE DRIFT: do not turn Kuwaiti food into Indian, Turkish, Lebanese, western seafood, hotel buffet, cafe, or luxury dine-in styling unless the actual product explicitly requires it.',
    'NO CUSTOMER DECEPTION: do not exaggerate portion size, protein amount, garnish, packaging, sides, or richness beyond what the real product can honestly represent.'
  ].filter(Boolean).join('\n');
};

export const buildKuwaitCaptionFallback = ({ packId, place, goal }: { packId: string; place: KuwaitOrderPlace; goal: KuwaitContentGoal }) => {
  const pack = getKuwaitPulsePack(packId);
  const placeInfo = KUWAIT_PLACES[place || pack.defaultPlace];
  if (goal === 'whatsapp') return pack.whatsappSeed;
  return `${pack.captionSeed}\nنوصل للـ${placeInfo.label} بكل ترتيب.`;
};
