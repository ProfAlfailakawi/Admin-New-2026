import { AppState } from '../types';
import { isPaidStatus } from './status-utils';

/**
 * ملهم الانستغرام — محرك البيانات الحقيقية
 * قاعدة صارمة: كل رقم/اسم/تاريخ هنا مصدره بيانات المطعم الفعلية أو التقويم الحقيقي.
 * لا أرقام وهمية، لا جوائز غير قابلة للتنفيذ، لا ادعاءات لا يمكن التحقق منها.
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
  topProducts: TopProductStat[];   // مرتبة بالأكثر مبيعاً (فعلي)
  cheapestTreat: TopProductStat | null; // أرخص صنف فعّال — يصلح جائزة رمزية حقيقية
  peakHourLabel: string | null;    // ساعة ذروة الطلبات الفعلية (null إذا البيانات قليلة)
  paidOrdersCount: number;
  hasSalesData: boolean;           // يوجد مبيعات مدفوعة كافية للاستشهاد بأرقام
  isKuwaitWeekend: boolean;        // خميس/جمعة/سبت
}

const fmtKD = (n: number) => `${Number(n.toFixed(3))} د.ك`;

function formatHourArabic(hour24: number): string {
  const period = hour24 < 12 ? 'الصبح' : hour24 < 15 ? 'الظهر' : hour24 < 18 ? 'العصر' : 'بالليل';
  let h = hour24 % 12;
  if (h === 0) h = 12;
  return `${h} ${period}`;
}

/** يحسب مؤشرات حقيقية 100% من حالة التطبيق */
export function computeStudioInsights(data: AppState): StudioInsights {
  const products = (data?.products || []).filter((p: any) => !p.isDeleted && p.isActive !== false);
  const invoices = (data?.invoices || []).filter((i: any) => !i.isDeleted);
  const paid = invoices.filter((inv: any) => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined);

  // كمية كل منتج من الفواتير المدفوعة الفعلية (نفس منطق المطابقة المعتمد في ai-engine)
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
  const cheapestTreat = [...stats]
    .filter(s => s.price > 0)
    .sort((a, b) => a.price - b.price)[0] || null;

  // ساعة الذروة الحقيقية — فقط إذا عندنا 10 فواتير فأكثر (وإلا ما نستشهد بها)
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

/* ─────────────────────────── المسابقات الاحترافية ─────────────────────────── */

export interface ContestKit {
  id: string;
  emoji: string;
  title: string;
  goal: string;              // الهدف التسويقي
  prize: string;             // الجائزة (حقيقية من المنيو) — أو توضيح "بدون سحب"
  mechanics: string[];       // شروط المشاركة مرقمة وواضحة
  scheduleLine: string;      // مدة حقيقية بتواريخ فعلية
  winnerMethod: string;      // طريقة اختيار الفائز بشفافية
  post: string;              // نص بوست الإطلاق كاملاً — جاهز للنسخ
  reminderStory: string;     // نص ستوري التذكير
  winnerAnnouncement: string;// نص إعلان الفائز
  hashtags: string;
  prizeNote?: string;        // تنبيه إن الجائزة اقتراح يعتمده صاحب المطعم
}

/** يحسب جدول مسابقة حقيقي: الإغلاق خميس قادم (نافذة ٤ أيام على الأقل) والسحب الجمعة التالية */
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

/** يبني عدة مسابقات كاملة قابلة للنشر — كل جائزة صنف حقيقي من منيو المطعم */
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
  const prizeNote = 'الجائزة اقتراح من عندنا بأصنافكم الحقيقية — تقدرون تغيرونها قبل النشر.';

  const followMechanics = [
    `تابعوا حسابنا ${IG_HANDLE}`,
    'اضغطوا لايك على البوست',
    'منشن ٢ من ربعكم بتعليق — كل تعليق فرصة إضافية',
    'اختياري: شير بالستوري مع منشننا = فرصتين زيادة'
  ];

  const kits: ContestKit[] = [];

  // ١) السحب الكبير — مسابقة متابعة كلاسيكية صحيحة الأركان
  kits.push({
    id: 'grand-draw',
    emoji: '🏆',
    title: 'سحب الديوانية الكبير',
    goal: 'زيادة المتابعين والوصول لحسابات جديدة',
    prize: `وجبة ${n1} مجانية${priceLine}`,
    mechanics: followMechanics,
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

  // ٢) توقع نجم الويكند — مسابقة لا يقدر عليها غيركم: النتيجة تنحسم من أرقام طلباتكم الفعلية
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
        `تابعوا ${IG_HANDLE} عشان توصلكم النتيجة`,
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
راسلونا على الخاص 🎁

توقعوا مسابقة أصعب المرة الجاية؟ 😏`,
      hashtags: CONTEST_HASHTAGS,
      prizeNote
    });
  }

  // ٣) معركة الأطباق — تصويت شفاف بدون سحب (مصارحة كاملة مع الجمهور)
  if (top1 && top2) {
    kits.push({
      id: 'dish-battle',
      emoji: '⚔️',
      title: 'معركة الأطباق (تصويت)',
      goal: 'تفاعل ستوري سريع بدون أي تكلفة',
      prize: 'بدون سحب — الطبق الفائز ينزل له تخفيض ظهور خاص بالستوري',
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

(هذا تصويت تفاعلي — بدون سحب وبدون شروط، بس ذوقكم)

${DEFAULT_HASHTAGS}`,
      reminderStory: `⏳ التصويت يقفل الليلة!

${n1} ولا ${n2}؟
الفرق بينهم ضيّق... صوتك ممكن يحسمها 👀`,
      winnerAnnouncement: `🏅 الجمهور قرر!

نجم الأسبوع بتصويتكم: ________

واللي طبقهم خسر... لا تزعلون، جولة ثانية قريب 😄
${DEFAULT_HASHTAGS}`,
      hashtags: DEFAULT_HASHTAGS
    });
  }

  // ٤) أفضل تعليق — تحكيم معلن بصراحة (مو سحب) وجائزة رمزية حقيقية من المنيو
  const treatPrize = treat
    ? `${treat.name} مجاناً مع طلبهم الجاي (قيمته ${fmtKD(treat.price)})`
    : `مفاجأة من المنيو مع طلبهم الجاي`;
  kits.push({
    id: 'best-comment',
    emoji: '💬',
    title: 'أطرف تعليق',
    goal: 'تعليقات كثيرة ترفع البوست بالخوارزمية',
    prize: treatPrize,
    mechanics: [
      `كملوا الجملة بالتعليقات: "أحلى طلب من التراث لازم يكون فيه ______"`,
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

  // ٥) صور طلباتكم — محتوى من العملاء (UGC) بشروط واضحة
  kits.push({
    id: 'ugc-photos',
    emoji: '📸',
    title: 'صوّر طلبك واربح',
    goal: 'محتوى حقيقي من العملاء + دليل اجتماعي',
    prize: `وجبة ${n1} مجانية بالسحب`,
    mechanics: [
      'صوروا طلبكم من التراث (صورة أو ستوري)',
      `منشنونا ${IG_HANDLE} عشان نشوف المشاركة`,
      'كل صورة ننشرها بستورينا = دخول بالسحب',
      `تابعوا الحساب عشان تنحسب مشاركتكم`
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
