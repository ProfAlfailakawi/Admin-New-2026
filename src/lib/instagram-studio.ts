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

export function buildContestKits(data: AppState, rotation = 0): ContestKit[] {
  const s = computeStudioInsights(data);
  const { closeLabel, drawLabel } = contestSchedule();

  // «تحديث الأفكار» يدوّر الأصناف المرشّحة للجوائز، فكل ضغطة تعطي جوائز مختلفة من منيوكم.
  const pool = s.topProducts.filter(p => p.name);
  const at = (i: number) => pool.length ? pool[(i + rotation) % pool.length] : null;
  const top1 = at(0) || s.topProducts[0] || null;
  const top2 = at(1) || s.topProducts[1] || null;
  const top3 = at(2) || s.topProducts[2] || null;
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
      `تابعونا هني ${IG_HANDLE}`,
      'حطوا لايك ع البوست',
      'منشنوا ٢ من ربعكم بتعليق — كل منشن يزيد حظكم',
      'وإذا سويتوا شير بالستوري وحطيتوا منشننا = حظين بعد'
    ],
    scheduleLine: `المشاركة من الحين لين ${closeLabel} الساعة ٩ بالليل — والسحب ${drawLabel}`,
    winnerMethod: 'سحب عشوائي بين كل اللي كمّلوا الشروط، والفايز ننزله بالستوري وبتعليق مثبّت',
    post: `🎉 مسابقة ربع التراث!

الجايزة: وجبة ${n1} علينا وببلاش 😍

شلون تدخل السحب:
١) تابعنا ${IG_HANDLE}
٢) حط لايك ع البوست
٣) منشن ٢ من ربعك بالكومنت (كل منشن حظ زياده)
✨ وإذا سويت شير بالستوري وحطيت منشننا = حظين بعد

⏰ باب المشاركة لين ${closeLabel} الساعة ٩ بالليل
🎁 والسحب ${drawLabel} ننزل الفايز بالستوري

الحسابات المسكّره والوهميه ما تدخل ترى.
بالتوفيق للكل يا حلوين 🤍

${CONTEST_HASHTAGS}`,
    reminderStory: `⏳ باجي شوي ويسكّر باب المشاركة!

مسابقة وجبة ${n1} ببلاش تخلص ${closeLabel} الساعة ٩ بالليل.
اللي ما شارك بعد — الشروط بالبوست اللي طاف 👇`,
    winnerAnnouncement: `🎉 مبروووك!

الفايز بسحب الديوانية: @________
دزلنا ع الخاص خلال ٤٨ ساعه عشان تستلم وجبة ${n1} 🎁

من قلبنا نشكر كل اللي شارك — والمسابقة الياي أقرب مما تتوقعون 🤍`,
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
        'اكتب توقعك بالكومنت: أي طبق بيكون الأكثر طلباً هالويكند؟',
        `الخيارات: ${choices}`,
        `تابعنا ${IG_HANDLE} عشان توصلك النتيجه`
      ],
      scheduleLine: `التوقعات لين ${closeLabel} — والنتيجه ${drawLabel} بعد ما نطلّع الأرقام`,
      winnerMethod: 'الطبق الفايز نطلّعه من أرقام طلباتنا الحقيقيه (مو تصويت) — وبعدها قرعه بين كل اللي توقعوا صح',
      post: `🔮 مسابقة التوقّع — والنتيجه من أرقامنا الحقيقيه!

بنظركم منو الطبق اللي بيتصدّر الطلبات هالويكند؟
${choices}

اكتبوا توقعكم بالكومنت 👇
وبعد الويكند بنطلّع أرقام طلباتنا ونعلن الطبق الفايز — واللي توقّع صح يدخل قرعه ع وجبة ${n2} ببلاش 🎁

⏰ التوقعات لين ${closeLabel}
📊 النتيجه والفايز: ${drawLabel}

${CONTEST_HASHTAGS}`,
      reminderStory: `🔮 توقعاتكم وايد وصلتنا — بس بعده في مجال!

منو الطبق اللي بياخذ المركز الأول هالويكند؟
اكتب توقعك قبل ${closeLabel}، والنتيجه من أرقام طلباتنا الحقيقيه 📊`,
      winnerAnnouncement: `📊 النتيجه الرسميه من أرقام طلباتنا!

الطبق الأكثر طلباً هالويكند طلع: ________ 🥇

وبالقرعه بين اللي توقعوا صح، الفايز بوجبة ${n2}: @________
دزلنا ع الخاص 🎁`,
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
        'النتيجه ننزلها نفس اليوم بستوري'
      ],
      scheduleLine: 'تصويت ليوم واحد — ينزل الصبح والنتيجه بالليل',
      winnerMethod: 'النتيجه زي ما هي من ستيكر التصويت — بدون أي تدخّل',
      post: `⚔️ معركة اليوم بالستوري!

${n1} 🆚 ${n2}

منو يستاهل لقب نجم الأسبوع؟ صوّتوا بالستوري الحين — والنتيجه الليله!

(تصويت للسواليف بس — بدون سحب وبدون شروط، ذوقكم يقرر)

${DEFAULT_HASHTAGS}`,
      reminderStory: `⏳ التصويت يسكّر الليله!

${n1} ولا ${n2}؟
الفرق بينهم حده ضيّق... صوتك ترى يقلبها 👀`,
      winnerAnnouncement: `🏅 الجمهور قال كلمته!

نجم الأسبوع بتصويتكم: ________

واللي طبقه خسر... لا تزعلون، عاد لنا جوله ثانيه قريب 😄`,
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
      'كمّل الجمله بالكومنت: "أحلى طلب من التراث لازم يكون فيه ______"',
      `تابعنا ${IG_HANDLE}`,
      'التعليق المكرر ما ينحسب ترى'
    ],
    scheduleLine: `الكومنتات لين ${closeLabel} — والإعلان ${drawLabel}`,
    winnerMethod: 'فريقنا يختار أطرف وأصدق تعليق (اختيار معلن — مو سحب عشوائي)',
    post: `😄 مسابقة أطرف كومنت!

كمّلوا الجمله:
"أحلى طلب من التراث لازم يكون فيه ______"

أطرف وأصدق تعليق (باختيار فريقنا) ياخذ ${treatPrize} 🎁

⏰ لين ${closeLabel} — ونعلن الفايز ${drawLabel}
تابعونا ${IG_HANDLE} عشان يوصلكم الإعلان

${CONTEST_HASHTAGS}`,
    reminderStory: `😄 كومنتاتكم قاعده تضحّكنا وايد!

بعده في مجال تشاركون بمسابقة أطرف كومنت — البوست اللي طاف 👇
الإعلان ${drawLabel}`,
    winnerAnnouncement: `🏆 أطرف كومنت بالإجماع!

مبروك @________ ع تعليقك اللي ضحّك الفريق كله 😂
${treatPrize} — دزلنا ع الخاص!

نشكر كل اللي شارك — كومنتاتكم كلها حده حلوه 🤍`,
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
      'صوّر طلبك من التراث (صوره أو ستوري)',
      `منشنّا ${IG_HANDLE} عشان نشوف مشاركتك`,
      'كل صوره نعيد نشرها = دخله بالسحب',
      'تابع الحساب عشان تنحسب مشاركتك'
    ],
    scheduleLine: `المشاركة لين ${closeLabel} — والسحب ${drawLabel}`,
    winnerMethod: 'سحب عشوائي بين كل اللي نزّلوا صور وكمّلوا الشروط، والفايز ننزله بالستوري',
    post: `📸 صوّر طلبك... واربح!

طلبت من التراث؟ صوّر طلبك ومنشنّا ${IG_HANDLE} بالستوري أو بالبوست.

كل صوره نعيد نشرها = دخله بالسحب ع وجبة ${n1} ببلاش 🎁

⏰ لين ${closeLabel}
🎉 والسحب ${drawLabel} — الفايز ننزله بالستوري

خلّوا الكل يشوف طلباتكم الناطعه 🔥

${CONTEST_HASHTAGS}`,
    reminderStory: `📸 صوركم قاعده تنزل عندنا بالستوري!

بعده في مجال تشاركون بسحب وجبة ${n1} —
صوّر طلبك ومنشنّا ${IG_HANDLE} قبل ${closeLabel} 🎁`,
    winnerAnnouncement: `🎉 خلص السحب!

الفايز بوجبة ${n1} من مسابقة "صوّر طلبك": @________
دزلنا ع الخاص عشان تستلمها 🎁

صوركم كلها تجوّع والله — نشكر كل اللي شارك 📸🤍`,
    hashtags: CONTEST_HASHTAGS,
    prizeNote
  });

  // دوّر ترتيب المسابقات حسب التحديث، فتظهر مسابقة مختلفة بالمقدمة كل مرة.
  if (kits.length > 1 && rotation > 0) {
    const shift = rotation % kits.length;
    return [...kits.slice(shift), ...kits.slice(0, shift)];
  }
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

export function buildEngagementIdeas(data: AppState, rotation = 0): EngagementIdea[] {
  const s = computeStudioInsights(data);
  // «تحديث» يدوّر الأصناف المذكورة، فتتغيّر الأفكار مع كل ضغطة.
  const pool = s.topProducts.filter(p => p.name).map(p => p.name);
  const n1 = (pool.length ? pool[rotation % pool.length] : '') || 'طبقكم المفضل';
  const n2 = (pool.length ? pool[(rotation + 1) % pool.length] : '') || 'طبق ثاني من المنيو';

  const ideas: EngagementIdea[] = [
    {
      id: 'this-or-that',
      emoji: '⚡',
      title: 'هذا ولا هذا',
      why: 'كل ضغطة تصويت تُحسب تفاعلاً — والخوارزمية توزّع الستوري اللي عليه ضغطات أكثر',
      caption: `سؤال يحيّر الكل 😅

${n1} ولا ${n2}؟

اختاروا بالكومنت — وخلونا نشوف الأغلبيه ويا منو 👇

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
      caption: `كمّلوا الجمله:

"يوم اليمعه ما يحلى إلا مع ______" 😍

أحلى جواب بننزله بالستوري ونمنشن صاحبه 🤍

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئله:
"يوم اليمعه ما يحلى إلا مع ______"

وأحلى الأجوبه بننشرها اليوم 👀`
    },
    {
      id: 'one-emoji',
      emoji: '😋',
      title: 'وصفه بإيموجي',
      why: 'أسهل تعليق ممكن — حاجز المشاركة صفر، فيشارك حتى المتابع الصامت',
      caption: `وصفوا ${n1} بإيموجي وحده بس 👇

ممنوع الكلام... بس إيموجي 😄

${DEFAULT_HASHTAGS}`,
      story: `صورة ${n1} + ستيكر أسئله:
"إيموجي وحده توصفه"`
    },
    {
      id: 'rate-it',
      emoji: '🔟',
      title: 'قيّمه من ١٠',
      why: 'التقييم يعطي المتابع رأياً يدافع عنه — وردودكم على التقييمات تضاعف التعليقات',
      caption: `بصراحه وبدون مجامله... قيّموا ${n1} من ١٠ 👀

واللي يعطيه أقل من ٧ يقولنا ليش 😅

${DEFAULT_HASHTAGS}`,
      story: `ستيكر سلايدر ع صورة ${n1}:
"قيّمه من ١٠ 🔥"`
    },
    {
      id: 'first-order',
      emoji: '🕰️',
      title: 'ذكريات أول طلب',
      why: 'القصص الشخصية تبني علاقة — والمتابع اللي يكتب قصته يرجع يشيّك على الردود',
      caption: `سؤال للي معانا من زمان:

شنو أول طلب طلبتوه من التراث؟ 🤍

اكتبوا قصتكم بالكومنت — نبي نعرف منين بدت السالفه وياكم

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئله:
"أول طلب طلبته من التراث كان..."

وبنعيد نشر أحلى الذكريات 🤍`
    },
    {
      id: 'ask-us',
      emoji: '❓',
      title: 'اسألونا عن المطبخ',
      why: 'صندوق الأسئلة يفتح حوار مباشر — وكل إجابة تنشرونها = ستوري إضافي بدون مجهود',
      caption: `اليوم المجال مفتوح... اسألونا أي شي عن مطبخنا 👨‍🍳

عن الأطباق، الطبخه، الكميات — شنو تبون تعرفون؟
أسئلتكم بنجاوب عليها بالستوري وحده وحده

${DEFAULT_HASHTAGS}`,
      story: `ستيكر أسئله:
"اسألونا أي شي عن مطبخ التراث 👨‍🍳"

وكل سؤال له جواب بالستوري`
    },
    {
      id: 'mention-friend',
      emoji: '👥',
      title: 'منشن اللي...',
      why: 'كل منشن يجيب شخص جديد للحساب — أرخص وصول لجمهور جديد بدون إعلانات',
      caption: `منشن الشخص اللي إذا شاف ${n1} ما يصبر عليه 😄

واللي ينمنشن... عليه الطلب الياي 😉

${DEFAULT_HASHTAGS}`,
      story: `نص الستوري:
"منشن اللي لازم يجرّب ${n1} 👇"
+ ستيكر أسئله للمنشن`
    },
    {
      id: 'behind-scenes',
      emoji: '🎬',
      title: 'خلف الكواليس',
      why: 'مقاطع التحضير الحقيقية أصدق محتوى تملكونه — والصدق هو اللي يوقف التمرير',
      caption: `من جوّه مطبخنا... ${n1} لحظه بلحظه 👨‍🍳🔥

هذا اللي يوصلكم حار وطازج — شنو تبون نصوّر لكم المره الياي؟

${DEFAULT_HASHTAGS}`,
      story: `فيديو قصير من التحضير الحقيقي + ستيكر تصويت:
"شنو نصوّر لكم بعد؟ التجهيز 🍳 / التغليف 📦"`
    }
  ];

  // دوّر ترتيب الأفكار حسب التحديث، فتظهر فكرة مختلفة بالمقدمة كل ضغطة.
  if (ideas.length > 1 && rotation > 0) {
    const shift = rotation % ideas.length;
    return [...ideas.slice(shift), ...ideas.slice(0, shift)];
  }
  return ideas;
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
        typeEmoji: '🕌', typeLabel: 'يمعة اليمعه',
        title: 'بوست يمعة الأهل',
        caption: `يمعه مباركه 🤍

يمعة اليوم محجوزه لـ${dish} — واللي يطلب بدري يضمن وصوله ع وقت الغدا.

🛒 اطلبوا من الرابط اللي بالبايو

${DEFAULT_HASHTAGS}`,
        tip: s.peakHourLabel ? `انشروا قبل ذروة طلباتكم (${s.peakHourLabel}) بساعه` : 'انشروا قبل الظهر — وقت ما يقررون الغدا'
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
        caption: `من جوّه مطبخنا... ${dish} لحظه بلحظه 👨‍🍳🔥

هذا اللي يوصلكم حار وطازج.

${DEFAULT_HASHTAGS}`,
        tip: 'مقطع ١٥-٣٠ ثانيه عمودي — أول ثانيتين لازم تكون أقوى لقطه'
      };
    } else if (dow === 1) {
      d = {
        typeEmoji: '⚡', typeLabel: 'تفاعل',
        title: 'تصويت: هذا ولا هذا',
        caption: `سؤال يحيّر 😅

${pick(0)} ولا ${pick(1)}؟

صوّتوا بالستوري — والنتيجه الليله 👀`,
        tip: 'ستوري تصويت + بوست خفيف — وأعلنوا النتيجه بنفس الليله'
      };
    } else if (dow === 2) {
      d = {
        typeEmoji: '🍽️', typeLabel: 'طبق الأسبوع',
        title: `تسليط الضوء: ${dish}`,
        caption: `طبق الأسبوع عندنا: ${dish} ✨

منطبوخ بنفس الطبخه اللي تعودتوا عليها — بدون أي اختصار.

🛒 الطلب من الرابط اللي بالبايو

${DEFAULT_HASHTAGS}`,
        tip: 'صوره طبيعيه بإضاءة نهار — الصور الحقيقيه تبيع أكثر من المعدّله'
      };
    } else {
      d = {
        typeEmoji: '💬', typeLabel: 'تفاعل',
        title: 'سؤال المتابعين',
        caption: `كمّلوا الجمله:

"أحلى طلب من التراث لازم يكون فيه ______" 😍

أحلى جواب بننزله بالستوري ونمنشن صاحبه 🤍

${DEFAULT_HASHTAGS}`,
        tip: 'ردوا ع كل كومنت — كل رد منكم يرفع البوست من يديد'
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
