import { AppState } from '../types';
import { isPaidStatus } from './status-utils';

/**
 * ملهم الانستغرام — محرك النمو والتفاعل
 * قاعدة صارمة: كل اسم وسعر وتاريخ هنا من بيانات المطعم الفعلية أو التقويم الحقيقي.
 * لا ترندات مخترعة، لا جوائز وهمية، لا أرقام تقديرية تُعرض كحقائق.
 */

export const IG_HANDLE = '@alturath.kw';
export const DEFAULT_HASHTAGS = '#مطعم_التراث #اكل_كويتي #الكويت #طلبات_الكويت #q8food #kuwaitfood';
export const CONTEST_HASHTAGS = '#مسابقة #مسابقات_الكويت #مطعم_التراث #اكل_كويتي #الكويت #q8food';

export interface TopProductStat {
  name: string;
  qty: number;      // كمية مباعة فعلياً من الفواتير المدفوعة
  price: number;    // السعر الحقيقي من المنيو
}

export interface StudioInsights {
  topProducts: TopProductStat[];
  cheapestTreat: TopProductStat | null;
  peakHourLabel: string | null;
  paidOrdersCount: number;
  hasSalesData: boolean;
  isKuwaitWeekend: boolean;
}

const fmtKD = (n: number) => `${Number(n.toFixed(3))} د.ك`;

function formatHourArabic(hour24: number): string {
  const period = hour24 < 12 ? 'الصبح' : hour24 < 15 ? 'الظهر' : hour24 < 18 ? 'العصر' : 'بالليل';
  let h = hour24 % 12;
  if (h === 0) h = 12;
  return `${h} ${period}`;
}

/** مؤشرات حقيقية 100% من حالة التطبيق */
export function computeStudioInsights(data: AppState): StudioInsights {
  const products = (data?.products || []).filter((p: any) => !p.isDeleted && p.isActive !== false);
  const invoices = (data?.invoices || []).filter((i: any) => !i.isDeleted);
  const paid = invoices.filter((inv: any) => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined);

  const stats: TopProductStat[] = products.map((product: any) => {
    const qty = paid.reduce((sum: number, inv: any) => {
      const item = (inv.items || []).find((it: any) =>
        it.productId === product.id || it.productName === product.name || it.name === product.name
      );
      return sum + (item ? Number(item.quantity || 0) : 0);
    }, 0);
    return { name: product.name || 'صنف من المنيو', qty, price: Number(product.price || 0) };
  });

  const topProducts = [...stats].sort((a, b) => b.qty - a.qty);
  const cheapestTreat = [...stats].filter(s => s.price > 0).sort((a, b) => a.price - b.price)[0] || null;

  let peakHourLabel: string | null = null;
  if (paid.length >= 10) {
    const buckets = new Array(24).fill(0);
    paid.forEach((inv: any) => {
      const d = new Date(inv.date);
      if (!isNaN(d.getTime())) buckets[d.getHours()] += 1;
    });
    const peak = buckets.indexOf(Math.max(...buckets));
    if (buckets[peak] > 0) peakHourLabel = formatHourArabic(peak);
  }

  const day = new Date().getDay();
  return {
    topProducts,
    cheapestTreat,
    peakHourLabel,
    paidOrdersCount: paid.length,
    hasSalesData: paid.length >= 5 && (topProducts[0]?.qty || 0) > 0,
    isKuwaitWeekend: day === 4 || day === 5 || day === 6
  };
}

/* ─────────────────────────── المسابقات ─────────────────────────── */

export interface ContestKit {
  id: string;
  emoji: string;
  title: string;
  goal: string;
  prize: string;
  mechanics: string[];
  scheduleLine: string;
  winnerMethod: string;
  post: string;
  reminderStory: string;
  winnerAnnouncement: string;
  hashtags: string;
  prizeNote?: string;
}

/** جدول مسابقة حقيقي: الإغلاق خميس قادم (نافذة ٤ أيام على الأقل) والسحب الجمعة التالية */
export function contestSchedule(now: Date = new Date()) {
  const close = new Date(now);
  do {
    close.setDate(close.getDate() + 1);
  } while (close.getDay() !== 4 || close.getTime() - now.getTime() < 4 * 86400000);
  const draw = new Date(close);
  draw.setDate(draw.getDate() + 1);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return { closeLabel: fmt(close), drawLabel: fmt(draw) };
}

export function buildContestKits(data: AppState): ContestKit[] {
  const s = computeStudioInsights(data);
  const { closeLabel, drawLabel } = contestSchedule();

  const top1 = s.topProducts[0] || null;
  const top2 = s.topProducts[1] || null;
  const top3 = s.topProducts[2] || null;
  const n1 = top1?.name || 'طبقكم المفضل من منيونا';
  const n2 = top2?.name || 'طبق ثاني من المنيو';
  const n3 = top3?.name || '';
  const treat = s.cheapestTreat;

  const priceLine = top1 && top1.price > 0 ? ` (قيمتها ${fmtKD(top1.price)} من المنيو)` : '';
  const prizeNote = 'الجائزة اقتراح بأصنافكم الحقيقية — عدّلوها قبل النشر لو حبيتوا.';

  const kits: ContestKit[] = [];

  kits.push({
    id: 'grand-draw',
    emoji: '🏆',
    title: 'سحب الديوانية الكبير',
    goal: 'زيادة المتابعين والوصول لحسابات جديدة',
    prize: `وجبة ${n1} مجانية${priceLine}`,
    mechanics: [
      `تابعوا حسابنا ${IG_HANDLE}`,
      'اضغطوا لايك على البوست',
      'منشن ٢ من ربعكم بتعليق — كل تعليق فرصة إضافية',
      'اختياري: شير بالستوري مع منشننا = فرصتين زيادة'
    ],
    scheduleLine: `المشاركة مفتوحة من اليوم حتى ${closeLabel} الساعة 9 بالليل — والسحب ${drawLabel}`,
    winnerMethod: 'سحب عشوائي بين كل المستوفين للشروط، ويُعلن الفائز بالستوري وبتعليق مثبت',
    post: `🎉 مسابقة الديوانية من مطعم التراث!

الجايزة: وجبة ${n1} مجانية علينا 😍

طريقة المشاركة:
1) تابعونا ${IG_HANDLE}
2) لايك للبوست
3) منشن ٢ من ربعكم بالتعليقات (كل تعليق = فرصة زيادة)
✨ شير بالستوري مع منشننا = فرصتين إضافية

⏰ المشاركة لين ${closeLabel} الساعة 9 بالليل
🎁 السحب ${drawLabel} ونعلن الفايز بالستوري

الحسابات المقفلة والوهمية ما تدخل السحب.
بالتوفيق للجميع 🤍

${CONTEST_HASHTAGS}`,
    reminderStory: `⏳ باجي شوي ويقفل باب المشاركة!

مسابقة وجبة ${n1} المجانية تنتهي ${closeLabel} الساعة 9 بالليل.
اللي ما شارك — الشروط بالبوست الأخير 👇`,
    winnerAnnouncement: `🎉 مبروووك!

الفايز بسحب الديوانية: @________
راسلونا على الخاص خلال ٤٨ ساعة لاستلام وجبة ${n1} 🎁

شكراً من القلب لكل اللي شارك — والمسابقة الجاية أقرب مما تتوقعون 🤍`,
    hashtags: CONTEST_HASHTAGS,
    prizeNote
  });

  if (top1 && top2 && s.hasSalesData) {
    const choices = n3 ? `${n1} 🥇 ولا ${n2} 🥈 ولا ${n3} 🥉` : `${n1} ولا ${n2}`;
    kits.push({
      id: 'weekend-predict',
      emoji: '🔮',
      title: 'توقع نجم الويكند',
      goal: 'تفاعل عالي بالتعليقات + ربط الجمهور بالمنيو',
      prize: `وجبة ${n2} مجانية للفائز بالقرعة`,
      mechanics: [
        'اكتبوا توقعكم بالتعليقات: أي طبق بيكون الأكثر طلباً هالويكند؟',
        `الخيارات: ${choices}`,
        `تابعوا ${IG_HANDLE} عشان توصلكم النتيجة`
      ],
      scheduleLine: `التوقعات مفتوحة حتى ${closeLabel} — والنتيجة تُعلن ${drawLabel} بعد ما نطلع الأرقام`,
      winnerMethod: 'نحسم الطبق الفائز من أرقام طلباتنا الفعلية (مو تصويت) — وبعدها قرعة بين كل اللي توقعوا صح',
      post: `🔮 مسابقة التوقع — والنتيجة من أرقامنا الحقيقية!

أي طبق بيكون الأكثر طلباً عندنا هالويكند؟
${choices}

اكتبوا توقعكم بالتعليقات 👇
بعد الويكند بنطلع الأرقام الفعلية من طلباتنا ونعلن الطبق الفائز — واللي توقعوا صح يدخلون قرعة على وجبة ${n2} مجانية 🎁

⏰ التوقعات مفتوحة حتى ${closeLabel}
📊 النتيجة والفايز: ${drawLabel}

${CONTEST_HASHTAGS}`,
      reminderStory: `🔮 توقعاتكم وصلت — بس باجي مجال!

أي طبق بياخذ المركز الأول هالويكند؟
اكتبوا توقعكم قبل ${closeLabel} والنتيجة من أرقام طلباتنا الفعلية 📊`,
      winnerAnnouncement: `📊 النتيجة الرسمية من أرقام طلباتنا!

الطبق الأكثر طلباً هالويكند كان: ________ 🥇

وبالقرعة بين اللي توقعوا صح، الفايز بوجبة ${n2}: @________
راسلونا على الخاص 🎁`,
      hashtags: CONTEST_HASHTAGS,
      prizeNote
    });
  }

  if (top1 && top2) {
    kits.push({
      id: 'dish-battle',
      emoji: '⚔️',
      title: 'معركة الأطباق (تصويت)',
      goal: 'تفاعل ستوري سريع بدون أي تكلفة',
      prize: 'بدون سحب — تصويت تفاعلي والطبق الفائز ياخذ ستوري خاص',
      mechanics: [
        'تصويت ستوري مباشر: خيارين بس',
        `${n1} ضد ${n2}`,
        'النتيجة تُعلن بنفس اليوم بستوري النتيجة'
      ],
      scheduleLine: 'تصويت ليوم واحد — ينزل الصبح وتُعلن النتيجة بالليل',
      winnerMethod: 'نتيجة التصويت كما هي من ستيكر الاستفتاء — بدون تدخل',
      post: `⚔️ معركة اليوم بالستوري!

${n1} 🆚 ${n2}

منو يستاهل لقب نجم الأسبوع؟ صوتوا بالستوري الحين — والنتيجة الليلة!

(تصويت تفاعلي — بدون سحب وبدون شروط، بس ذوقكم)

${DEFAULT_HASHTAGS}`,
      reminderStory: `⏳ التصويت يقفل الليلة!

${n1} ولا ${n2}؟
الفرق بينهم ضيّق... صوتك ممكن يحسمها 👀`,
      winnerAnnouncement: `🏅 الجمهور قرر!

نجم الأسبوع بتصويتكم: ________

واللي طبقهم خسر... لا تزعلون، جولة ثانية قريب 😄`,
      hashtags: DEFAULT_HASHTAGS
    });
  }

  const treatPrize = treat
    ? `${treat.name} مجاناً مع طلبهم الجاي (قيمته ${fmtKD(treat.price)})`
    : 'مفاجأة من المنيو مع طلبهم الجاي';
  kits.push({
    id: 'best-comment',
    emoji: '💬',
    title: 'أطرف تعليق',
    goal: 'تعليقات كثيرة ترفع البوست بالخوارزمية',
    prize: treatPrize,
    mechanics: [
      'كملوا الجملة بالتعليقات: "أحلى طلب من التراث لازم يكون فيه ______"',
      `تابعوا ${IG_HANDLE}`,
      'التعليق المكرر ما يُحتسب'
    ],
    scheduleLine: `التعليقات مفتوحة حتى ${closeLabel} — والإعلان ${drawLabel}`,
    winnerMethod: 'فريقنا يختار أطرف وأصدق تعليق (اختيار تحكيمي معلن — مو سحب عشوائي)',
    post: `😄 مسابقة أطرف تعليق!

كمّلوا الجملة:
"أحلى طلب من التراث لازم يكون فيه ______"

أطرف وأصدق تعليق (باختيار فريقنا) ياخذ ${treatPrize} 🎁

⏰ حتى ${closeLabel} — ونعلن الفايز ${drawLabel}
تابعونا ${IG_HANDLE} عشان يوصلكم الإعلان

${CONTEST_HASHTAGS}`,
    reminderStory: `😄 تعليقاتكم قاعدة تضحكنا!

باجي مجال تشاركون بمسابقة أطرف تعليق — البوست الأخير 👇
الإعلان ${drawLabel}`,
    winnerAnnouncement: `🏆 أطرف تعليق بالإجماع!

مبروك @________ على تعليقك اللي خلا الفريق كله يضحك 😂
${treatPrize} — راسلونا على الخاص!

شكراً لكل اللي شارك — تعليقاتكم كلها ذهب 🤍`,
    hashtags: CONTEST_HASHTAGS,
    prizeNote
  });

  kits.push({
    id: 'ugc-photos',
    emoji: '📸',
    title: 'صوّر طلبك واربح',
    goal: 'محتوى حقيقي من العملاء + دليل اجتماعي يقنع المتردد',
    prize: `وجبة ${n1} مجانية بالسحب`,
    mechanics: [
      'صوروا طلبكم من التراث (صورة أو ستوري)',
      `منشنونا ${IG_HANDLE} عشان نشوف المشاركة`,
      'كل صورة ننشرها بستورينا = دخول بالسحب',
      'تابعوا الحساب عشان تنحسب مشاركتكم'
    ],
    scheduleLine: `المشاركة مفتوحة حتى ${closeLabel} — والسحب ${drawLabel}`,
    winnerMethod: 'سحب عشوائي بين كل أصحاب الصور اللي استوفوا الشروط، ويُعلن بالستوري',
    post: `📸 صوّر طلبك... واربح!

طلبتوا من التراث؟ صوروا طلبكم ومنشنونا ${IG_HANDLE} بالستوري أو بالبوست.

كل صورة نعيد نشرها = دخول بالسحب على وجبة ${n1} مجانية 🎁

⏰ حتى ${closeLabel}
🎉 السحب ${drawLabel} — والفايز نعلنه بالستوري

خلوا الكل يشوف طلباتكم الناطعة 🔥

${CONTEST_HASHTAGS}`,
    reminderStory: `📸 صوركم قاعدة تنزل عندنا بالستوري!

باجي فرصة تشاركون بسحب وجبة ${n1} —
صوروا طلبكم ومنشنونا ${IG_HANDLE} قبل ${closeLabel} 🎁`,
    winnerAnnouncement: `🎉 السحب تم!

الفايز بوجبة ${n1} من مسابقة "صوّر طلبك": @________
راسلونا على الخاص لاستلامها 🎁

صوركم كلها كانت تجوع — شكراً لكل اللي شارك 📸🤍`,
    hashtags: CONTEST_HASHTAGS,
    prizeNote
  });

  return kits;
}

/* ─────────────────────────── التفاعل اليومي ─────────────────────────── */

export interface EngagementIdea {
  id: string;
  emoji: string;
  title: string;
  why: string;          // آلية حقيقية: ليش هالنوع يرفع التفاعل (بدون أرقام مؤلفة)
  caption: string;      // نص بوست جاهز
  story: string;        // نسخة ستوري جاهزة
}

export function buildEngagementIdeas(data: AppState): EngagementIdea[] {
  const s = computeStudioInsights(data);
  const n1 = s.topProducts[0]?.name || 'طبقكم المفضل';
  const n2 = s.topProducts[1]?.name || 'طبق ثاني من المنيو';

  return [
    {
      id: 'this-or-that',
      emoji: '⚡',
      title: 'هذا ولا هذا',
      why: 'كل ضغطة تصويت تُحسب تفاعلاً — والخوارزمية توزّع الستوري اللي عليه ضغطات أكثر',
      caption: `سؤال يحير الجميع 😅

${n1} ولا ${n2}؟

اختاروا بالتعليقات — وخلونا نشوف الأغلبية مع منو 👇

${DEFAULT_HASHTAGS}`,
      story: `ستيكر تصويت بخيارين:
« ${n1} » ضد « ${n2} »

نص الستوري: القرار عندكم اليوم 👀`
    },
    {
      id: 'finish-sentence',
      emoji: '✍️',
      title: 'كمّل الجملة',
      why: 'الأسئلة المفتوحة تجيب تعليقات طويلة — والتعليقات أثقل إشارة تفاعل عند إنستغرام',
      caption: `كمّلوا الجملة:

"يوم الجمعة ما يحلى إلا مع ______" 😍

أمتع إجابة بننزلها بالستوري مع منشن صاحبها 🤍

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئلة:
"يوم الجمعة ما يحلى إلا مع ______"

وأحلى الإجابات بننشرها اليوم 👀`
    },
    {
      id: 'one-emoji',
      emoji: '😋',
      title: 'وصفه بإيموجي',
      why: 'أسهل تعليق ممكن — حاجز المشاركة صفر، فيشارك حتى المتابع الصامت',
      caption: `وصفوا ${n1} بإيموجي واحد بس 👇

ممنوع الكلام... بس إيموجي 😄

${DEFAULT_HASHTAGS}`,
      story: `صورة ${n1} + ستيكر أسئلة:
"إيموجي واحد يوصفه"`
    },
    {
      id: 'rate-it',
      emoji: '🔟',
      title: 'قيّمه من ١٠',
      why: 'التقييم يعطي المتابع رأياً يدافع عنه — وردودكم على التقييمات تضاعف التعليقات',
      caption: `بصراحة تامة... قيّموا ${n1} من ١٠ 👀

واللي يعطيه أقل من ٧ يشرح لنا ليش 😅

${DEFAULT_HASHTAGS}`,
      story: `ستيكر مقياس (سلايدر) على صورة ${n1}:
"قيّمه من ١٠ 🔥"`
    },
    {
      id: 'first-order',
      emoji: '🕰️',
      title: 'ذكريات أول طلب',
      why: 'القصص الشخصية تبني علاقة — والمتابع اللي يكتب قصته يرجع يشيّك على الردود',
      caption: `سؤال للي معانا من زمان:

شنو كان أول طلب طلبتوه من التراث؟ 🤍

اكتبوا قصتكم بالتعليقات — نبي نعرف من وين بدت الحكاية معاكم

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئلة:
"أول طلب طلبته من التراث كان..."

وبنعيد نشر أحلى الذكريات 🤍`
    },
    {
      id: 'ask-us',
      emoji: '❓',
      title: 'اسألونا عن المطبخ',
      why: 'صندوق الأسئلة يفتح حوار مباشر — وكل إجابة تنشرونها = ستوري إضافي بدون مجهود',
      caption: `اليوم المجال مفتوح... اسألونا أي شي عن مطبخنا 👨‍🍳

عن الأطباق، الطريقة، الكميات — وش تبون تعرفون؟
أسئلتكم بنجاوبها بالستوري وحدة وحدة

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئلة:
"اسألونا أي شي عن مطبخ التراث 👨‍🍳"

وكل سؤال له إجابة بالستوري`
    },
    {
      id: 'mention-friend',
      emoji: '👥',
      title: 'منشن اللي...',
      why: 'كل منشن يجيب شخص جديد للحساب — أرخص وصول لجمهور جديد بدون إعلانات',
      caption: `منشن الشخص اللي إذا شاف ${n1} ما يقدر يقاوم 😄

واللي ينمنشن... عليه الطلب الجاي 😉

${DEFAULT_HASHTAGS}`,
      story: `نص الستوري:
"منشن اللي لازم يجرب ${n1} 👇"
+ ستيكر أسئلة للمنشن`
    },
    {
      id: 'behind-scenes',
      emoji: '🎬',
      title: 'خلف الكواليس',
      why: 'مقاطع التحضير الحقيقية أصدق محتوى تملكونه — والصدق هو اللي يوقف التمرير',
      caption: `من داخل مطبخنا... ${n1} لحظة بلحظة 👨‍🍳🔥

هذا اللي يوصلكم حار وطازج — شنو تبون نصوّر لكم المرة الجاية؟

${DEFAULT_HASHTAGS}`,
      story: `فيديو قصير من التحضير الحقيقي + ستيكر تصويت:
"وش نصوّر لكم بعد؟ التجهيز 🍳 / التغليف 📦"`
    }
  ];
}

/* ─────────────────────────── خطة الأسبوع ─────────────────────────── */

export interface WeekPlanDay {
  id: string;
  dayLabel: string;      // "الخميس 23 يوليو" — تاريخ حقيقي
  isToday: boolean;
  isWeekend: boolean;    // ويكند الكويت
  typeEmoji: string;
  typeLabel: string;     // مسابقة / تفاعل / طبق اليوم / ستوري / خلف الكواليس
  title: string;
  caption: string;       // النص الجاهز للنسخ
  tip: string;           // توجيه تنفيذي قصير
}

/** خطة ٧ أيام من تاريخ اليوم الفعلي — أصناف حقيقية وتوزيع مدروس على أيام الأسبوع */
export function buildWeekPlan(data: AppState, rotation = 0): WeekPlanDay[] {
  const s = computeStudioInsights(data);
  const dishes = s.topProducts.filter(p => p.name).map(p => p.name);
  const pick = (i: number) => dishes.length ? dishes[(i + rotation) % dishes.length] : 'طبقكم المفضل';
  const n1 = pick(0);
  const kits = buildContestKits(data);
  const contest = kits[rotation % kits.length] || kits[0];

  const fmt = new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' });
  const days: WeekPlanDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    const isWeekend = dow === 4 || dow === 5 || dow === 6;
    const dayLabel = fmt.format(date);
    const dish = pick(i);

    let d: Omit<WeekPlanDay, 'id' | 'dayLabel' | 'isToday' | 'isWeekend'>;

    if (dow === 4) {
      // الخميس: إطلاق مسابقة الويكند — أعلى ليلة تفاعل بالكويت
      d = {
        typeEmoji: contest.emoji, typeLabel: 'مسابقة',
        title: `إطلاق: ${contest.title}`,
        caption: contest.post,
        tip: 'ثبتوا البوست وردوا على أول التعليقات بسرعة — الردود المبكرة ترفع وصوله'
      };
    } else if (dow === 5) {
      d = {
        typeEmoji: '🕌', typeLabel: 'يمعة الجمعة',
        title: 'بوست يمعة الأهل',
        caption: `جمعة مباركة 🤍

يمعة اليوم محجوزة لـ${dish} — الطلب المبكر يضمن وصوله على وقت الغدا.

🛒 اطلبوا من الرابط بالبايو

${DEFAULT_HASHTAGS}`,
        tip: s.peakHourLabel ? `انشروا قبل ذروة طلباتكم (${s.peakHourLabel}) بساعة` : 'انشروا قبل الظهر — وقت قرار الغدا'
      };
    } else if (dow === 6) {
      d = {
        typeEmoji: '⏳', typeLabel: 'تذكير المسابقة',
        title: 'ستوري تذكير المشاركة',
        caption: contest.reminderStory,
        tip: 'ستوري بس — وأعيدوا نشر مشاركات المتابعين اللي وصلتكم'
      };
    } else if (dow === 0) {
      d = {
        typeEmoji: '🎬', typeLabel: 'خلف الكواليس',
        title: `ريلز تحضير ${dish}`,
        caption: `من داخل مطبخنا... ${dish} لحظة بلحظة 👨‍🍳🔥

هذا اللي يوصلكم حار وطازج.

${DEFAULT_HASHTAGS}`,
        tip: 'مقطع ١٥-٣٠ ثانية عمودي — أول ثانيتين لازم تكون أقوى لقطة'
      };
    } else if (dow === 1) {
      d = {
        typeEmoji: '⚡', typeLabel: 'تفاعل',
        title: 'تصويت: هذا ولا هذا',
        caption: `سؤال يحير 😅

${pick(0)} ولا ${pick(1)}؟

صوتوا بالستوري — والنتيجة الليلة 👀`,
        tip: 'ستوري تصويت + بوست خفيف — وأعلنوا النتيجة بنفس الليلة'
      };
    } else if (dow === 2) {
      d = {
        typeEmoji: '🍽️', typeLabel: 'طبق الأسبوع',
        title: `تسليط الضوء: ${dish}`,
        caption: `طبق الأسبوع عندنا: ${dish} ✨

مطبوخ بنفس الطريقة اللي تعودتوا عليها — بدون اختصارات.

🛒 الطلب من الرابط بالبايو

${DEFAULT_HASHTAGS}`,
        tip: 'صورة طبيعية بإضاءة نهار — الصور الحقيقية تبيع أكثر من المعدلة'
      };
    } else {
      d = {
        typeEmoji: '💬', typeLabel: 'تفاعل',
        title: 'سؤال المتابعين',
        caption: `كمّلوا الجملة:

"أحلى طلب من التراث لازم يكون فيه ______" 😍

أمتع إجابة بننزلها بالستوري مع منشن صاحبها 🤍

${DEFAULT_HASHTAGS}`,
        tip: 'ردوا على كل تعليق — كل رد منكم يرفع البوست من جديد'
      };
    }

    days.push({
      id: `day-${i}`,
      dayLabel,
      isToday: i === 0,
      isWeekend,
      ...d
    });
  }

  return days;
}
