/*
 * alturathStudioBrain.ts
 *
 * هذا الملف في مجلد الأدمن هو نسخة طبق الأصل من الملف الموجود في جذر المشروع
 * (src/lib/alturathStudioBrain.ts). الغرض منه توفير منطق تصنيف الأطباق
 * الكويتي والشعبي والبحري داخل مشروع الأدمن حتى يمكن استيراده بسهولة
 * دون الخلط بين مشروع العميل ومشروع الأدمن. تمت إضافة وظائف إضافية
 * لتوليد "بصمة الطبق" وتلخيص تصنيفات قائمة المنتجات، مع الحفاظ على
 * القواعد الصارمة بعدم اختراع أطباق غير موجودة أو تغيير البروتينات.
 *
 * لا يحتوي هذا الملف على أي منطق يتعلق بالدفع أو قاعدة البيانات أو
 * الإشعارات أو التوليد نفسه؛ هو مجرد أداة مساعدة لبناء التعزيزات
 * النصية (prompts) والتعامل مع الأطباق.
 */

export type DishCategory =
  | 'fish'
  | 'meat'
  | 'chicken'
  | 'prawn'
  | 'rice'
  | 'stew'
  | 'mahshi'
  | 'grill'
  | 'dessert'
  | 'unknown';

/**
 * توصيات للمشهد واللقطة اعتماداً على فئة الطبق. الهدف من هذه التوصيات
 * هو إعطاء المولد فكرة عن أفضل زاوية أو بيئة لعرض الأكلة مع الحفاظ
 * على هويتها؛ لا تلزم الواجهة باتباعها، ولكن يمكن استخدامها في بناء
 * الـ prompt أو لإظهار تلميحات للمستخدم. لا تتضمن أي منطق عرض أو بيانات
 * قاعدة، وهي مستقلة عن واجهة المستخدم.
 */
export interface DishSignature {
  /**
   * توصية عامة للمشهد الأنسب لالتقاط الصورة. قد تكون عبارة عن وصف
   * بالعربية يصف مكان أو إعداد معين (مثل سفرة بيتية، ديوانية، شاليه).
   */
  recommendedScene: string;
  /**
   * توصية لزاوية أو نوع لقطة الكاميرا المناسبة، مثل لقطة علوية
   * (top shot) أو اقتراب على الطبق، أو بخار خفيف. لا ترتبط هذه
   * التوصيات بمعرّفات المشاهد أو اللقطات في الواجهة، بل نصائح نصية.
   */
  recommendedShot: string;
  /**
   * ملاحظة إضافية اختيارية تشرح سبب اختيار هذه اللقطة أو المشهد.
   */
  note?: string;
}

/**
 * قوائم بالكلمات المفتاحية التي تساعد في تحديد نوع الطبق.
 */
const FISH_KEYWORDS = ['زبيدي', 'هامور', 'شعري', 'كنعد', 'صبور', 'ميد', 'نقرور', 'الشعم', 'السبيطي', 'سمك'];
const MEAT_KEYWORDS = ['لحم', 'معلاق', 'برية اللحم', 'برية لحم', 'حنيذ', 'مفطح'];
const CHICKEN_KEYWORDS = ['دجاج', 'جكن', 'تشكن', 'chicken'];
const PRAWN_KEYWORDS = ['ربيان', 'روبيان', 'مربيان', 'shrimp', 'prawn'];
const RICE_KEYWORDS = ['مجبوس', 'مكبوس', 'مچبوس', 'برياني', 'عيش', 'صينية عيوش', 'صينية', 'بوكس', 'بوكسات', 'بوكسات السفر'];
const STEW_KEYWORDS = ['مرق', 'صالونة', 'صالونه', 'إيدام', 'قبوط', 'مرقوق'];
const MAHSHI_KEYWORDS = ['محشي', 'محاشي', 'ورق عنب', 'ورق العنب', 'ورق العنب'];
const GRILL_KEYWORDS = ['مشوي', 'مشويات', 'كباب', 'تكا', 'أوصال', 'عرايس', 'شيش طاووق', 'grill'];
const DESSERT_KEYWORDS = ['حلو', 'حلويات', 'لقيمات', 'درابيل', 'خنفروش', 'رهش', 'بثيث', 'خنفروش'];

/**
 * تصنيف الطبق بحسب الكلمات المفتاحية. إذا لم تنطبق أي فئة معروفة، يرجع
 * 'unknown'. يعتمد هذا التصنيف على وجود كلمة مفتاحية داخل اسم المنتج
 * بالصيغة الأصلية ولا يغير منطق الواجهة أو قاعدة البيانات.
 */
export function getDishCategory(name: string): DishCategory {
  const term = String(name || '').toLowerCase();
  const contains = (arr: string[]) => arr.some((kw) => term.includes(kw.toLowerCase()));
  if (contains(FISH_KEYWORDS)) return 'fish';
  if (contains(PRAWN_KEYWORDS)) return 'prawn';
  if (contains(CHICKEN_KEYWORDS)) return 'chicken';
  // لحم يجب أن لا يسبق دجاج لأن كلمة "لحم" قد تظهر ضمن وصف "دجاج باللحم" وغيرها
  if (contains(MEAT_KEYWORDS)) return 'meat';
  if (contains(MAHSHI_KEYWORDS)) return 'mahshi';
  if (contains(STEW_KEYWORDS)) return 'stew';
  if (contains(RICE_KEYWORDS)) return 'rice';
  if (contains(GRILL_KEYWORDS)) return 'grill';
  if (contains(DESSERT_KEYWORDS)) return 'dessert';
  return 'unknown';
}

/**
 * استرجاع توصية المشهد واللقطة حسب اسم الطبق. تستخدم الكلمات
 * المفتاحية لفهم الفئة، ثم تعيد توقيعًا ملائمًا. إذا لم يمكن
 * التعرف على الفئة، يعيد null للإشارة لغياب توصية محددة.
 *
 * @param name اسم الطبق أو المنتج كما هو مسجل في قاعدة البيانات
 */
export function getDishSignature(name: string): DishSignature | null {
  const category = getDishCategory(name);
  switch (category) {
    case 'fish':
    case 'prawn':
      return {
        recommendedScene: 'سفرة بيتية أو طلب عائلي بسيط يبرز السمك أو الروبيان مع العيش',
        recommendedShot: 'لقطة علوية أو بزاوية ٤٥ درجة تبرز شكل السمكة أو حبات الروبيان بشكل واضح، بدون بخار مبالغ فيه',
        note: 'الأطباق البحرية تحتاج إظهار السمك أو الروبيان بوضوح مع العيش؛ الزوايا العلوية تعطي إحساسًا بالوفرة والنظافة'
      };
    case 'meat':
      return {
        recommendedScene: 'سفرة بيتية أو ديوانية مع صينية عيوش ولحم',
        recommendedShot: 'لقطة بزاوية ٤٥ درجة أو اقتراب على قطعة اللحم والرز لبيان التفاصيل والشهية',
        note: 'أطباق اللحم تحتاج إبراز القطعة الرئيسية وتوازن كمية العيش؛ يفضل تجنب البخار القوي'
      };
    case 'chicken':
      return {
        recommendedScene: 'طلب توصيل جاهز أو سفرة بيتية لعشاء عائلي',
        recommendedShot: 'لقطة قريبة من مستوى العين أو ٤٥ درجة، تبرز الدجاج فوق العيش مع توضيح القوام',
        note: 'أطباق الدجاج يجب أن تحافظ على شكل قطع الدجاج وتوزيعه على العيش؛ اللقطة المقربة تساعد على ذلك'
      };
    case 'rice':
      return {
        recommendedScene: 'صينية عيوش مرتبة على سفرة بيتية أو زوارة',
        recommendedShot: 'لقطة علوية مرتبة تبرز توزيع العيش والتزيين بشكل متساوٍ',
        note: 'عند التركيز على العيش، تفيد اللقطة العلوية في إظهار التوزيع والكمية بوضوح'
      };
    case 'stew':
      return {
        recommendedScene: 'إيدام أو مرق في صحن عميق على سفرة بيتية',
        recommendedShot: 'لقطة قريبة لتفاصيل الصلصة والمكونات مع زاوية طفيفة لعرض العمق',
        note: 'الإيدامات تحتاج إبراز الصوص والمكونات، لذا تفيد اللقطة المقربة البسيطة'
      };
    case 'mahshi':
      return {
        recommendedScene: 'طبق محاشي أو ورق عنب مرتب على صينية لزوارة أو سفرة عائلية',
        recommendedShot: 'لقطة علوية أو ٤٥ درجة تبرز ترتيب المحاشي وألوانها، بدون ازدحام زائد',
        note: 'المحاشي تحتاج ترتيباً واضحاً ولوناً حقيقياً، فاللقطة العلوية مناسبة لذلك'
      };
    case 'grill':
      return {
        recommendedScene: 'طلب مشويات في ديوانية أو بيت مع صحن مشويات وعيش أو خبز',
        recommendedShot: 'لقطة بزاوية ٤٥ درجة تبرز الشواء واللون الذهبي على القطع، مع خلفية بسيطة',
        note: 'المشاوي تحتاج إظهار علامات الشواء بوضوح وتجنب البخار، لذا يفضل استخدام لقطة ٤٥ درجة'
      };
    case 'dessert':
      return {
        recommendedScene: 'طبق حلوى كويتي صغير على طاولة نظيفة أو صينية حلوى',
        recommendedShot: 'لقطة قريبة أو علوية تبرز تفاصيل اللقيمات أو الحلويات بدون أطباق رئيسية معها',
        note: 'الحلويات تتطلب الإضاءة الناعمة وزاوية قريبة لتظهر القوام والألوان'
      };
    default:
      return null;
  }
}

/**
 * يبني فقرة نصية صغيرة تحتوي على توقيع المشهد واللقطة للطبق إن كان معروفاً.
 * إذا لم يتوفر توقيع، يعيد نصًا فارغًا. يمكن إدراج هذا النص في
 * الـ prompt أو عرضه للمستخدم كتلميح. يُفضل الحفاظ عليه قصيرًا
 * حتى لا يتعارض مع التعليمات الأخرى.
 */
export function buildDishSignaturePrompt(name: string): string {
  const sig = getDishSignature(name);
  if (!sig) return '';
  const parts = [
    sig.recommendedScene ? `المشهد المناسب: ${sig.recommendedScene}.` : '',
    sig.recommendedShot ? `اللقطة المناسبة: ${sig.recommendedShot}.` : ''
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * إنشاء ملخص نصي لفئات الأطباق الموجودة في قائمة المنتجات. يعيد نصًا بالعربية
 * يوضح للمولد كيف يتعامل مع كل فئة دون إعادة اختراع أطباق غير موجودة.
 * إذا كانت القائمة فارغة أو لم تحدد فئات معروفة، يرجع نصًا فارغًا.
 */
export function summarizeMenuCategories(names: string[]): string {
  const categories = new Set<DishCategory>();
  names.forEach((name) => categories.add(getDishCategory(name)));
  const parts: string[] = [];
  if (categories.has('fish')) {
    parts.push('القائمة تحتوي على أطباق سمك وبحرية مثل الزبيدي والهامور وغيرها؛ يجب إبراز هوية السمك والعيش بزاوية علوية أو بزاوية ٤٥ درجة، وتجنب تحويل السمك إلى دجاج أو لحم أو إضافة بروتينات غير موجودة. تأكد من أن الكمية واقعية ومناسبة للتوصيل.');
  }
  if (categories.has('rice')) {
    parts.push('القائمة تحتوي على أطباق عيش ومجبوس وبرياني؛ يجب إبراز العيش بشكل واضح مع البروتين الأصلي فوقه، ويمكن استخدام لقطة اقتراب أو بخار خفيف، ولا يتم استبدال الدجاج باللحم أو العكس. حافظ على توازن الكمية وعدم إغراق الإطار بالرز.');
  }
  if (categories.has('meat')) {
    parts.push('هناك أطباق تعتمد على اللحم مثل برية اللحم أو حنيذ؛ يجب إبراز قطعة اللحم وكمية العيش بشكل واقعي، وتجنب الخلط بينها وبين الدجاج أو السمك، ويفضل تصويرها بزاوية ٤٥ درجة أو لقطة قريبة تظهر تفاصيل اللحم.');
  }
  if (categories.has('chicken')) {
    parts.push('هناك أطباق بالدجاج؛ يجب الحفاظ على هوية الدجاج وعدم تحويله إلى أنواع أخرى، وإبراز الطبق بواقعية وكمية مناسبة مع العيش.');
  }
  if (categories.has('prawn')) {
    parts.push('القائمة تحتوي على أطباق بالروبيان أو الربيان؛ يجب إبراز حبّات الروبيان بوضوح وتجنب استبدالها بالأسماك أو اللحوم، ويُنصح باللقطة العلوية أو القريبة لإظهار القوام.');
  }
  if (categories.has('stew')) {
    parts.push('هناك أطباق إيدام أو مرق؛ يجب إبراز الصوص والمكونات الأصلية بدون إضافة بروتينات غير موجودة، مع لقطة اقتراب للصلصة أو الطبق بزاوية طفيفة لعرض العمق.');
  }
  if (categories.has('mahshi')) {
    parts.push('هناك محاشي وورق عنب؛ يجب تقديمها بترتيب مرتب ولونها الحقيقي وعدم تحويلها إلى أطباق أخرى، ويفضل تصويرها علوياً لإظهار التنظيم.');
  }
  if (categories.has('grill')) {
    parts.push('هناك أطباق مشوية مثل الكباب والتكا؛ يجب إبراز قطع المشاوي بوضوح وتجنب إضافة صوصات أو أطباق غير موجودة، واختيار زاوية ٤٥ درجة لإظهار علامات الشواء.');
  }
  if (categories.has('dessert')) {
    parts.push('هناك حلويات كويتية مثل اللقيمات والدرابيل؛ يجب إبرازها بلقطات قريبة بدون إضافة أطباق رئيسية معها، مع إضاءة ناعمة تبرز القوام.');
  }
  if (parts.length === 0) return '';
  return parts.join(' ');
}

/**
 * بناء فقرة إضافية لتعزيز الالتزام بهوية الطبق وعدم تحويل المكونات الأساسية. يمكن
 * استدعاؤها داخل بناء الـ prompt لضمان الحفاظ على الواقعية وعدم تغيير
 * البروتين. تعيد نصًا مختصرًا بالعربية.
 */
export function buildDishIdentityPrompt(name: string): string {
  const category = getDishCategory(name);
  switch (category) {
    case 'fish':
      return 'تذكر أن هذا الطبق سمك؛ يجب أن تبقى هوية السمك واضحة ولا تتحول إلى دجاج أو لحم، وأن تكون كمية السمك واقعية وغير مبالغ فيها.';
    case 'meat':
      return 'تذكر أن هذا الطبق لحم؛ لا تضف دجاجًا أو سمكًا ولا تغير البروتين، وحافظ على حجم قطعة اللحم والعيش بشكل واقعي.';
    case 'chicken':
      return 'تذكر أن هذا الطبق دجاج؛ لا تحول الدجاج إلى لحم أو سمك، وحافظ على شكل قطع الدجاج وحجمها الطبيعي.';
    case 'prawn':
      return 'تذكر أن هذا الطبق روبيان؛ يجب أن تبقى حبات الروبيان واضحة ولا تستبدلها ببروتينات أخرى، وأن تظهر كمية الروبيان بشكل طبيعي.';
    default:
      return '';
  }
}

/**
 * طبقة قرارات التصوير المتقدمة: لا تضيف منتجات ولا تغيّر واجهة.
 * الهدف منها أن يفكر الاستوديو كعين مصور + شيف كويتي قبل إرسال التعليمات للمولد.
 */
export interface DishVisualDecision {
  eye: string;
  openClosed: string;
  vessel: string;
  angle: string;
  steam: string;
  sauce: string;
  portion: string;
  delivery: string;
  menuPhoto: string;
  sceneCorrection: string;
  foreignCuisineGuard: string;
  honestyGuard: string;
  sensitivity: 'normal' | 'high';
}

const HIGH_SENSITIVITY_DISHES = [
  'مطبق الزبيدي', 'زبيدي', 'برية اللحم', 'برية لحم', 'بريه اللحم', 'بريه لحم',
  'برية الدجاج', 'بريه الدجاج', 'مموش', 'معدس', 'مرقوق', 'قبوط', 'تشريب', 'ثريد',
  'جريش', 'هريس', 'مطبق سمك', 'مطبق هامور', 'مطبق شعري', 'مطبق كنعد', 'مربيان', 'روبيان'
];

function hasAnyWord(value: string, words: string[]) {
  const term = String(value || '').toLowerCase();
  return words.some((w) => term.includes(String(w).toLowerCase()));
}

export function isHighSensitivityDish(name: string): boolean {
  return hasAnyWord(name, HIGH_SENSITIVITY_DISHES);
}

/**
 * عين الطبق: تحدد قرارات تصوير داخلية لكل صنف قبل التوليد.
 * هذه القرارات لا تظهر كواجهة جديدة؛ تستخدم فقط داخل الـ prompt للحفاظ على الواقعية.
 */
export function getDishVisualDecision(name: string): DishVisualDecision {
  const category = getDishCategory(name);
  const sensitive = isHighSensitivityDish(name);
  const base: DishVisualDecision = {
    eye: 'اجعل الطبق هو البطل بصرياً، لا الخلفية ولا الزينة.',
    openClosed: 'اعرض الطبق واضحاً ومفتوحاً إذا كان ذلك يخدم التعرف عليه؛ لا تخفِ هويته داخل علبة مغلقة بالكامل.',
    vessel: 'استخدم صحن أو علبة أو صينية منطقية لحجم الطبق، بدون أواني فاخرة غريبة.',
    angle: 'اختر زاوية واقعية توضّح المنتج على شاشة الهاتف.',
    steam: 'لا تستخدم البخار إلا إذا كان الطبق حاراً فعلاً، وبشكل خفيف جداً.',
    sauce: 'لا تضف صوصات أو إضافات غير موجودة في المنتج.',
    portion: 'الكمية تكون مقنعة تجارياً لكنها غير مبالغ فيها وغير خادعة.',
    delivery: 'الصورة يجب أن تصلح لمطبخ توصيل: تغليف أو سفرة نظيفة أو كاونتر بسيط، لا مطعم جلوس.',
    menuPhoto: 'إذا كانت صورة منيو، اجعل الخلفية أهدأ والطبق أوضح من أي مؤثر بصري.',
    sceneCorrection: 'إذا كان المشهد المختار لا يناسب الطبق، صحّحه داخلياً بهدوء دون تغيير اختيار المستخدم ظاهرياً.',
    foreignCuisineGuard: 'حافظ على المزاج الكويتي/الخليجي للطبق ولا تحوله إلى نمط هندي أو تركي أو غربي أو فندقي.',
    honestyGuard: 'لا تخدع العميل: لا تكبر الكمية، لا تضف مكونات، لا تحسن التغليف أو الطبق بما يخالف الواقع.',
    sensitivity: sensitive ? 'high' : 'normal'
  };

  switch (category) {
    case 'fish':
      return {
        ...base,
        eye: 'العين أولاً على نوع السمك نفسه، خصوصاً الزبيدي أو الهامور أو الشعري، مع العيش إن كان جزءاً من الطبق.',
        openClosed: 'يفضل أن يكون السمك ظاهراً لا مخفياً بالكامل داخل التغليف.',
        vessel: 'طبق أو صينية عيش/سمك واقعية؛ لا قواقع ولا سوشي ولا ديكور بحري أجنبي.',
        angle: 'لقطة علوية أو ٤٥ درجة تبرز السمك والعيش وحجم الحصة الحقيقي.',
        steam: 'بخار خفيف جداً فقط إذا كان الطبق ساخناً؛ لا بخار مسرحي.',
        sauce: 'لا تضف صوصات أجنبية أو مقبلات بحرية غير موجودة.',
        portion: 'حجم السمكة أو قطع السمك متناسب مع العيش، لا سمكة عملاقة ولا كمية قليلة محرجة.',
        foreignCuisineGuard: 'لا تجعل السمك بأسلوب غربي seafood، ولا سوشي، ولا مطعم فاخر؛ يجب أن يبقى طبقاً كويتياً بيتياً/توصيلياً.',
      };
    case 'prawn':
      return {
        ...base,
        eye: 'العين على حبات الروبيان/المربيان بوضوح مع العيش أو التقديم البحري الكويتي.',
        angle: 'لقطة علوية أو قريبة تبرز الحبات بدون تحويلها إلى سمك كامل.',
        sauce: 'لا تضف صوصات أجنبية أو مأكولات بحرية إضافية غير موجودة.',
        portion: 'عدد الحبات وحجمها واقعي ومقنع، لا مبالغة ولا تقليل.',
        foreignCuisineGuard: 'لا تحوله إلى طبق آسيوي أو غربي؛ حافظ على المربيان/الروبيان الكويتي.',
      };
    case 'meat':
      return {
        ...base,
        eye: 'العين على قطعة اللحم والعيش أو الصلصة حسب الطبق، وليس على الزينة.',
        angle: 'زاوية ٤٥ درجة أو اقتراب بسيط يوضح اللحم والكمية.',
        steam: 'بخار خفيف واقعي إذا كان الطبق ساخناً، بدون دخان مسرحي.',
        portion: 'اللحم واضح ومقنع، لا يتحول إلى وليمة ضخمة ولا إلى قطع صغيرة مخفية.',
        foreignCuisineGuard: 'لا تحوله إلى كبسة/برياني هندي إذا كان برية أو طبق كويتي؛ حافظ على الشخصية المحلية.',
      };
    case 'chicken':
      return {
        ...base,
        eye: 'العين على قطع الدجاج وتوزيعها فوق العيش أو داخل العلبة.',
        angle: '٤٥ درجة أو اقتراب على الدجاج مع العيش، دون تغيير البروتين.',
        portion: 'كمية الدجاج والعيش متوازنة ومناسبة للتوصيل.',
        foreignCuisineGuard: 'لا تجعل الطبق مطعم دجاج غربي أو برياني هندي إذا كان مجبوساً أو طبقاً كويتياً.',
      };
    case 'rice':
      return {
        ...base,
        eye: 'العين على العيش وتوزيع البروتين والزينة البسيطة، لا على خلفية مزدحمة.',
        vessel: 'صينية أو طبق عيش واقعي يناسب البيت أو التوصيل.',
        angle: 'لقطة علوية للكمية أو ٤٥ درجة للبروتين، حسب المشهد.',
        steam: 'بخار خفيف فقط إذا كان يخدم الإحساس بالحرارة ولا يغطي العيش.',
        portion: 'توازن العيش والبروتين مهم؛ لا بحر رز بلا بروتين ولا بروتين ضخم.',
        foreignCuisineGuard: 'حافظ على روح العيش الكويتي؛ لا تحوله تلقائياً إلى برياني هندي أو كبسة خارج الهوية إذا لم يكن المنتج كذلك.',
      };
    case 'stew':
      return {
        ...base,
        eye: 'العين على قوام المرق/الإيدام والمكونات داخل الصحن.',
        vessel: 'وعاء أو صحن عميق واقعي؛ لا صحن مسطح يخفي طبيعة المرق.',
        angle: 'لقطة قريبة بزاوية خفيفة لعرض العمق والقوام.',
        steam: 'بخار خفيف جداً إذا كان الطبق ساخناً، دون إخفاء التفاصيل.',
        portion: 'المرق ممتلئ بشكل مقنع لكن لا يفيض ولا يبدو مصطنعاً.',
        foreignCuisineGuard: 'لا تحوله إلى كاري هندي أو شوربة غربية؛ حافظ على صالونة/مرق كويتي.',
      };
    case 'mahshi':
      return {
        ...base,
        eye: 'العين على ترتيب المحاشي أو ورق العنب وعدد القطع.',
        openClosed: 'يفضل إظهار الصفوف بوضوح، لا إخفاؤها داخل علبة مغلقة.',
        vessel: 'صينية أو صحن عائلي مرتب، أو علبة واضحة عند التوصيل.',
        angle: 'لقطة علوية أو ٤٥ درجة، بدون بخار.',
        steam: 'ممنوع البخار تقريباً؛ ورق العنب والمحاشي لا يحتاجان بخاراً بصرياً.',
        sauce: 'لا صوص طائر ولا ليمون مبالغ ولا إضافات غير موجودة.',
        portion: 'عدد القطع منطقي ومرتب، لا تكديس مبالغ ولا فراغ زائد.',
      };
    case 'grill':
      return {
        ...base,
        eye: 'العين على علامات الشواء والتحمير الواقعي للقطع.',
        angle: 'زاوية ٤٥ درجة أو لقطة قريبة تظهر الشواء بدون دخان كثيف.',
        steam: 'لا دخان مبالغ؛ حرارة ولمعة بسيطة فقط.',
        portion: 'عدد الأسياخ أو القطع منطقي للطلب، لا وليمة خيالية.',
        foreignCuisineGuard: 'لا تجعل المشويات مطعماً تركياً أو لبنانياً إذا كان تقديم مطبخ كويتي للتوصيل.',
      };
    case 'dessert':
      return {
        ...base,
        eye: 'العين على القوام والملمس والحواف، لا على ديكور فاخر.',
        angle: 'لقطة قريبة أو علوية هادئة، بدون بخار.',
        steam: 'ممنوع البخار للحلويات.',
        portion: 'كمية حلوى صادقة وجذابة، لا تكديس مبالغ.',
        foreignCuisineGuard: 'لا تحول الحلوى الشعبية إلى باتيسري غربي أو بوفيه فندق.',
      };
    default:
      return base;
  }
}

export function buildDishVisualDecisionPrompt(name: string): string {
  const decision = getDishVisualDecision(name);
  return [
    `EYE OF DISH: ${decision.eye}`,
    `OPEN/CLOSED DECISION: ${decision.openClosed}`,
    `VESSEL DECISION: ${decision.vessel}`,
    `CAMERA ANGLE DECISION: ${decision.angle}`,
    `STEAM LOGIC: ${decision.steam}`,
    `SAUCE/EXTRAS LOGIC: ${decision.sauce}`,
    `PORTION BALANCE: ${decision.portion}`,
    `DELIVERY SUITABILITY: ${decision.delivery}`,
    `MENU PHOTO MODE: ${decision.menuPhoto}`,
    `SCENE CORRECTOR: ${decision.sceneCorrection}`,
    `FOREIGN CUISINE BLOCKER: ${decision.foreignCuisineGuard}`,
    `NO-DECEPTION RULE: ${decision.honestyGuard}`,
    decision.sensitivity === 'high'
      ? 'HIGH SENSITIVITY DISH: use stricter identity preservation; do not reinterpret this dish even if the scene suggests another cuisine.'
      : ''
  ].filter(Boolean).join(' ');
}

export function buildSceneCorrectionPrompt(name: string, sceneLabel?: string): string {
  const decision = getDishVisualDecision(name);
  const category = getDishCategory(name);
  const scene = String(sceneLabel || '').trim();
  const corrections: string[] = [];
  if (category === 'mahshi') corrections.push('If the selected scene implies steam or hot dramatic motion, reduce it; mahshi/warak enab should stay neat and mostly steam-free.');
  if (category === 'fish' || category === 'prawn') corrections.push('If the selected scene is too generic, keep seafood identity dominant and avoid western seafood styling.');
  if (category === 'stew') corrections.push('If the selected scene is a dry platter, correct it to a bowl/deep plate logic so the stew remains recognizable.');
  if (category === 'dessert') corrections.push('If the selected scene implies a main meal spread, simplify to dessert-focused composition.');
  if (category === 'grill') corrections.push('If the selected scene implies rice tray, keep grill pieces visible and do not bury them under rice unless the actual product says so.');
  corrections.push(`Selected scene should be respected visually (${scene || 'current scene'}), but not allowed to distort the food identity. ${decision.sceneCorrection}`);
  return corrections.join(' ');
}

export function buildForeignCuisineBlockerPrompt(names: string[] = [], customText = ''): string {
  const catalog = [...names, customText].filter(Boolean).join(' ');
  const hasFish = getDishCategory(catalog) === 'fish' || hasAnyWord(catalog, FISH_KEYWORDS);
  const hasGrill = getDishCategory(catalog) === 'grill' || hasAnyWord(catalog, GRILL_KEYWORDS);
  const hasRice = getDishCategory(catalog) === 'rice' || hasAnyWord(catalog, RICE_KEYWORDS);
  return [
    'KUWAITI MOOD GUARD: The image must feel like Kuwaiti/Gulf home-order food, not a hotel buffet, not a luxury restaurant, not a cafe, not a Turkish/Lebanese/Indian/Western concept unless the actual product explicitly says so.',
    hasRice ? 'Rice dishes must not automatically become Indian biryani visuals unless the actual product is biryani.' : '',
    hasFish ? 'Fish dishes must not become western seafood platters, sushi, shells, or foreign coastal restaurant styling.' : '',
    hasGrill ? 'Grills must not turn into Turkish or Lebanese restaurant presentation; keep delivery/home Kuwaiti serving logic.' : '',
    'Avoid foreign props, luxury tableware, hotel buffet abundance, theatrical garnish, and culturally mismatched decorations.'
  ].filter(Boolean).join(' ');
}

export function buildNoDeceptionPrompt(name = ''): string {
  const decision = getDishVisualDecision(name);
  return [
    'NO CUSTOMER DECEPTION POLICY: The generated image must not imply a larger portion, richer garnish, more protein, better packaging, or extra sides beyond what the actual product reasonably includes.',
    decision.portion,
    'Do not make the meal look more expensive, bigger, or more premium than the restaurant can honestly deliver.',
    'Honest improvement is allowed: cleaner light, better angle, correct shadows, tidy setup. Dish invention is not allowed.'
  ].join(' ');
}

export function buildPreMenuDecisionPrompt(name: string, existsInCatalog: boolean): string {
  const sig = getDishSignature(name);
  const decision = getDishVisualDecision(name);
  return [
    existsInCatalog
      ? 'PRE-MENU MODE: Product exists in the catalog; optimize it as a real menu item.'
      : 'PRE-MENU MODE SAFETY: If this dish is not in the catalog, treat it only as internal visual planning. Do not generate it as an approved menu item unless the user explicitly added it to products.',
    sig ? `Suggested scene: ${sig.recommendedScene}. Suggested shot: ${sig.recommendedShot}.` : '',
    decision.menuPhoto,
    'For menu usage: clarity beats decoration; product identity and portion truth beat visual drama.'
  ].filter(Boolean).join(' ');
}

export function buildCategoryVisualLanguage(names: string[]): string {
  const categories = new Set<DishCategory>();
  names.forEach((name) => categories.add(getDishCategory(name)));
  const parts: string[] = [];
  if (categories.has('rice')) parts.push('أطباق العيش: لغة التصوير = صينية أو طبق واضح، بروتين ظاهر، لقطة علوية أو ٤٥ درجة، كمية صادقة، خلفية هادئة.');
  if (categories.has('fish') || categories.has('prawn')) parts.push('الأطباق البحرية: لغة التصوير = إبراز السمك/الروبيان نفسه، عدم الخلط مع دجاج أو لحم، لا سوشي ولا قواقع ولا seafood غربي.');
  if (categories.has('stew')) parts.push('المرقيات والإيدامات: لغة التصوير = وعاء عميق أو صحن واضح، قوام المرق ظاهر، بخار خفيف فقط.');
  if (categories.has('mahshi')) parts.push('المحاشي وورق العنب: لغة التصوير = صفوف مرتبة، لقطة علوية، بدون بخار، بدون صوصات متحركة.');
  if (categories.has('grill')) parts.push('المشاوي: لغة التصوير = تحمير واقعي، زاوية ٤٥ درجة، لا دخان كثيف، لا مطعم تركي/لبناني مبالغ.');
  if (categories.has('dessert')) parts.push('الحلويات: لغة التصوير = قوام وحواف نظيفة، إضاءة هادئة، لا بخار، لا فخامة فندقية.');
  return parts.join(' ');
}

export function buildSensitiveDishGuardPrompt(name: string): string {
  if (!isHighSensitivityDish(name)) return '';
  return 'HIGH-SENSITIVITY KUWAITI DISH GUARD: This dish is commonly misunderstood by image generation. Use strict identity preservation. Do not reinterpret it as a generic rice, generic fish, biryani, curry, western seafood, pastry, or unrelated dish.';
}

export function buildAdvancedMenuContext(names: string[] = [], customText = '', sceneLabel = ''): string {
  const safeNames = Array.isArray(names) ? names.filter(Boolean) : [];
  const focusName = customText || safeNames[0] || '';
  const existsInCatalog = focusName ? safeNames.some((name) => String(name).trim() === String(focusName).trim()) : false;
  return [
    summarizeMenuCategories(safeNames),
    buildCategoryVisualLanguage(safeNames),
    buildDishVisualDecisionPrompt(focusName),
    buildSceneCorrectionPrompt(focusName, sceneLabel),
    buildForeignCuisineBlockerPrompt(safeNames, customText),
    buildNoDeceptionPrompt(focusName),
    buildPreMenuDecisionPrompt(focusName, existsInCatalog),
    buildSensitiveDishGuardPrompt(focusName)
  ].filter(Boolean).join(' ');
}
