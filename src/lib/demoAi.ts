/**
 * Demo-only canned "AI" answers (image studio, reels, assistant chat, CEO copilot, quick messages).
 * Used exclusively by installDemoNetworkGuard() through demoApiResponse() — never reached outside
 * demo mode, never touches the network. Everything here is fictitious and computed locally from the
 * in-memory demo dataset so the answers agree with the numbers on screen.
 */
import { GET_DEMO_DATA } from '../data';

const DEMO_NOTE = 'نسخة تجريبية';

type Body = Record<string, any>;

const money = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);

// ---------------------------------------------------------------- pictures

const SCENES: Array<{ keys: string[]; label: string; emoji: string; hue: number }> = [
  { keys: ['مجبوس', 'دجاج', 'رز', 'machboos'], label: 'مجبوس دجاج عائلي', emoji: '🍛', hue: 28 },
  { keys: ['وليمة', 'غنم', 'خروف', 'عزيمة'], label: 'وليمة غنم على سفرة', emoji: '🍖', hue: 18 },
  { keys: ['سمك', 'مطبق', 'زبيدي', 'صافي', 'بحري'], label: 'مطبق زبيدي', emoji: '🐟', hue: 200 },
  { keys: ['حلويات', 'لقيمات', 'خبيصة', 'كنافة'], label: 'حلويات المناسبات', emoji: '🍰', hue: 330 },
  { keys: ['توصيل', 'delivery', 'علب'], label: 'طلب توصيل مرتب', emoji: '🛵', hue: 150 },
  { keys: ['ديوانية', 'خميس', 'ويكند', 'شاليه'], label: 'ديوانية الخميس', emoji: '🌙', hue: 260 },
];

function pickScene(text: string) {
  const t = String(text || '').toLowerCase();
  return SCENES.find(s => s.keys.some(k => t.includes(k))) || SCENES[0];
}

function dims(format: string): [number, number] {
  if (format === '9:16') return [540, 960];
  if (format === '4:3') return [800, 600];
  return [800, 800];
}

const esc = (s: string) => s.replace(/[<>&"]/g, '');
const toUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** A self-contained "generated" picture: warm table, soft light, plate with the dish, clear demo ribbon. */
export function demoSceneImage(label: string, hue: number, emoji: string, format = '1:1', variant = 0): string {
  const [w, h] = dims(format);
  const hv = (hue + variant * 25) % 360;
  const h2 = (hv + 30) % 360;
  const k = (Math.min(w, h) / 300) * 1.05; // plate group is drawn in a 400x300 box centred on (200,140)
  const tx = w / 2 - 200 * k, ty = h * 0.46 - 140 * k;
  const stripes = Array.from({ length: Math.ceil(h / 46) }, (_, i) => `<path d="M0 ${i * 46} Q${w / 2} ${i * 46 + 16} ${w} ${i * 46}" fill="none"/>`).join('');
  const dots = [[96, 40, 10], [320, 62, 8], [78, 236, 7], [338, 228, 11], [52, 132, 6], [356, 140, 7]]
    .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${(hv + 120 + i * 20) % 360},55%,55%)" fill-opacity=".5"/>`).join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(label)}</title>` +
    `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hv},40%,32%)"/><stop offset="1" stop-color="hsl(${h2},46%,13%)"/></linearGradient>` +
    `<radialGradient id="l" cx=".28" cy=".18" r=".95"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="p" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e9e2d6"/></radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#t)"/><g stroke="#fff" stroke-opacity=".05" stroke-width="3">${stripes}</g><rect width="${w}" height="${h}" fill="url(#l)"/>` +
    `<g transform="translate(${tx} ${ty}) scale(${k})">` +
    `<ellipse cx="200" cy="196" rx="132" ry="26" fill="#000" fill-opacity=".38"/>` +
    `<circle cx="200" cy="140" r="112" fill="url(#p)"/><circle cx="200" cy="140" r="112" fill="none" stroke="hsl(${hv},45%,62%)" stroke-opacity=".7" stroke-width="3"/>` +
    `<circle cx="200" cy="140" r="84" fill="hsl(${hv},30%,96%)" stroke="#d8cfbf" stroke-width="1.5"/>${dots}` +
    `<text x="200" y="146" font-size="104" text-anchor="middle" dominant-baseline="middle">${emoji}</text></g>` +
    `<rect x="0" y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="#000" fill-opacity=".38"/>` +
    `<text x="${w / 2}" y="${h * 0.895}" font-size="${Math.min(w, h) * 0.05}" fill="#fff" text-anchor="middle" font-family="sans-serif">${esc(label)}</text>` +
    `<text x="${w / 2}" y="${h * 0.945}" font-size="${Math.min(w, h) * 0.027}" fill="#fff" fill-opacity=".8" text-anchor="middle" font-family="sans-serif">صورة توضيحية - ${DEMO_NOTE}</text>` +
    `</svg>`;
  return toUri(svg);
}

/** Animated SVG "reel" (9:16). The studio already renders data:image/svg reels with an <img>. */
export function demoReelMotion(label: string, hue: number, emoji: string, seconds = 6): string {
  const w = 540, h = 960;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,58%)"><animate attributeName="stop-color" values="hsl(${hue},70%,58%);hsl(${(hue + 50) % 360},70%,52%);hsl(${hue},70%,58%)" dur="${seconds}s" repeatCount="indefinite"/></stop>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},62%,30%)"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<g fill="#fff" fill-opacity=".18"><circle cx="90" cy="820" r="24"><animate attributeName="cy" values="860;260;860" dur="${seconds}s" repeatCount="indefinite"/></circle>` +
    `<circle cx="300" cy="900" r="16"><animate attributeName="cy" values="920;180;920" dur="${seconds * 0.8}s" repeatCount="indefinite"/></circle>` +
    `<circle cx="450" cy="780" r="30"><animate attributeName="cy" values="840;320;840" dur="${seconds * 1.2}s" repeatCount="indefinite"/></circle></g>` +
    `<ellipse cx="270" cy="590" rx="230" ry="38" fill="#000" fill-opacity=".35"/>` +
    `<circle cx="270" cy="470" r="200" fill="#fff" fill-opacity=".94"/><circle cx="270" cy="470" r="200" fill="none" stroke="hsl(${hue},50%,60%)" stroke-width="5"/>` +
    `<circle cx="270" cy="470" r="150" fill="hsl(${hue},30%,96%)" stroke="#d8cfbf" stroke-width="2"/>` +
    `<text x="270" y="478" font-size="220" text-anchor="middle" dominant-baseline="middle">${emoji}` +
    `<animate attributeName="font-size" values="210;250;210" dur="${seconds / 2}s" repeatCount="indefinite"/></text>` +
    `<path d="M200 250 q-20 -50 0 -90 M270 230 q-20 -50 0 -100 M340 250 q-20 -50 0 -90" stroke="#fff" stroke-opacity=".55" stroke-width="8" fill="none" stroke-linecap="round">` +
    `<animate attributeName="stroke-opacity" values=".1;.7;.1" dur="${seconds / 3}s" repeatCount="indefinite"/></path>` +
    `<text x="270" y="800" font-size="40" fill="#fff" text-anchor="middle" font-family="sans-serif">${esc(label)}</text>` +
    `<text x="270" y="850" font-size="24" fill="#fff" fill-opacity=".8" text-anchor="middle" font-family="sans-serif">ريل توضيحي - ${DEMO_NOTE}</text>` +
    `</svg>`;
  return toUri(svg);
}

/** Reel archive samples for the studio's reel history (demo only). */
export function demoReelArchive(): any[] {
  const rows: Array<[string, number, string, number, string]> = [
    ['بخار المجبوس الساخن', 28, '🍛', 6, 'steam-close'],
    ['فتح علبة الوليمة', 18, '🍖', 8, 'box-open'],
    ['صينية الحلويات من الأعلى', 330, '🍰', 5, 'top-spread'],
  ];
  return rows.map(([idea, hue, emoji, duration, shot], i) => ({
    url: demoReelMotion(idea, hue, emoji, duration),
    poster: demoSceneImage(idea, hue, emoji, '9:16'),
    date: new Date(Date.now() - (i * 2 + 1) * 86400000).toISOString(),
    duration, shot, source: 'idea', format: '9:16', idea, place: 'delivery', mood: 'دافئ',
  }));
}

// -------------------------------------------------------------- data helpers

function stats() {
  const d = GET_DEMO_DATA();
  const paid = (d.invoices as any[]).filter(i => !i.isDeleted && (i.paymentStatus === 'paid' || /paid|تم الدفع/.test(String(i.status))));
  const since = Date.now() - 30 * 86400000;
  const recent = paid.filter(i => +new Date(i.date) >= since);
  const sum = (arr: any[], k: string) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);
  const revenue = sum(recent, 'totalAmount');
  const cost = sum(recent, 'totalCost');
  const prod = new Map<string, number>();
  const cust = new Map<string, number>();
  recent.forEach(i => {
    (i.items || []).forEach((it: any) => prod.set(it.name || it.productName, (prod.get(it.name || it.productName) || 0) + Number(it.quantity || 0)));
    if (i.customerName) cust.set(i.customerName, (cust.get(i.customerName) || 0) + Number(i.totalAmount || 0));
  });
  const topProducts = [...prod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topCustomers = [...cust.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const orders = d.orders as any[];
  const pending = orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'split_pending').length;
  const failed = orders.filter(o => o.paymentStatus === 'failed').length;
  return { count: recent.length, revenue, profit: revenue - cost, topProducts, topCustomers, pending, failed };
}

function assistantReply(message: string): string {
  const m = String(message || '');
  const s = stats();
  const margin = s.revenue > 0 ? Math.round((s.profit / s.revenue) * 100) : 0;
  const line = (arr: Array<[string, number]>, unit: string) => arr.map(([n, v]) => `- ${n}: ${unit === 'د.ك' ? money(v) : v} ${unit}`).join('\n');
  const tail = `\n\n_ردّ تجريبي مبني على بيانات العرض فقط._`;

  if (/عميل|زبون|vip/i.test(m)) {
    return `### الخلاصة\nأقوى العملاء خلال آخر 30 يوماً هم الثلاثة التاليون، والاحتفاظ بهم أولوية اليوم.\n\n### السبب\n${line(s.topCustomers, 'د.ك')}\n\n### الإجراء\nأرسل لكل واحد منهم رسالة شكر قصيرة مع عرض الخميس القادم، بدون خصم عشوائي.${tail}`;
  }
  if (/منتج|أكثر|الأكثر|طبق|صنف/i.test(m)) {
    return `### الخلاصة\nالمبيعات متركزة في ثلاثة أصناف واضحة، وهي الأولى بالمخزون والتجهيز.\n\n### السبب\n${line(s.topProducts, 'مبيع')}\n\n### الإجراء\nتأكد من توفر مكونات هذه الأصناف قبل عطلة نهاية الأسبوع، وجرّب عرض تجميعة يضمّ أحدها.${tail}`;
  }
  if (/ربح|هامش|تكلفة/i.test(m)) {
    return `### الخلاصة\nصافي الربح التشغيلي آخر 30 يوماً **${money(s.profit)} د.ك** بهامش **${margin}%**.\n\n### السبب\n- الإيراد: ${money(s.revenue)} د.ك\n- عدد الفواتير المدفوعة: ${s.count}\n\n### الإجراء\nراجع أسعار الموردين الأعلى ارتفاعاً من شاشة حارس الربح قبل تثبيت قائمة الأسبوع.${tail}`;
  }
  if (/دفع|لم يدفع|معلق|فشل/i.test(m)) {
    return `### الخلاصة\nعندك **${s.pending}** طلب بانتظار الدفع و**${s.failed}** طلبات فشل دفعها.\n\n### الإجراء\nافتح طلبات الموقع وفلتر حسب بانتظار الدفع، ثم أرسل رابط الدفع مرة ثانية للعملاء الجدد قبل انتهاء مهلة القطية.${tail}`;
  }
  if (/مورد|موردين|دفعة/i.test(m)) {
    return `### الخلاصة\nمتابعة الموردين تتم من شاشة الموردين؛ أرصدتهم محسوبة بنفس محرك التسوية في كل الشاشات.\n\n### الإجراء\nابدأ بمورد اللحوم لأن حصته الأكبر في التكلفة، وقارن سعر آخر فاتورتين قبل الدفع.${tail}`;
  }
  if (/رسالة|واتساب|رد/i.test(m)) {
    return `### رسالة مقترحة\nحياك الله 🌿 مطبخ التراث الكويتي يشكرك على ثقتك. عندنا هالأسبوع وليمة الخميس العائلية بسعر مناسب، وتوصيل مجاني للطلبات فوق 60 د.ك. تأمر على شي؟\n\n### السبب\nنص قصير ودافئ بدون أرقام مبالغ فيها.${tail}`;
  }
  return `### الخلاصة\nآخر 30 يوماً: **${s.count}** فاتورة مدفوعة بإيراد **${money(s.revenue)} د.ك** وهامش **${margin}%**.\n\n### السبب\n${line(s.topProducts.slice(0, 2), 'مبيع')}\n- بانتظار الدفع: ${s.pending} طلب\n\n### الإجراء\nتابع الطلبات المعلقة اليوم، وركّز العرض القادم على الصنف الأكثر طلباً.${tail}`;
}

const QUICK_MESSAGES: Record<string, string[]> = {
  motivation: [
    'كل طبق نجهزه فيه شغل أيدينا وحب أهل الديرة 🌿',
    'الخميس جاي.. جهّز عزيمتك ونحن علينا الباقي 🍖',
    'شكراً لكل بيت اختارنا، ثقتكم أحلى من أي إعلان ✨',
  ],
  engagement: [
    'شنو طبقك المفضل في عزيمة الجمعة؟ شاركنا رأيك 👇',
    'منو أكثر واحد في الديوانية يحب المجبوس؟ منشنه! 🍛',
    'مجبوس ولا مطبق زبيدي؟ صوّت الحين 🤔',
  ],
};

function marketingCampaignText(): string {
  const plan = {
    campaignType: 'حملة وليمة الخميس العائلية',
    idea: 'باقة وليمة غنم تكفي 10 أشخاص مع سلطة وحلويات بسعر مجمّع، تُطلب قبل 24 ساعة.',
    message: 'عزيمتك الجاية عندنا.. وليمة تكفي الجميع وطعم يذكّرك بأيام زمان.',
    whatsappMessage: 'حياك الله 🌿 عرض الخميس: وليمة غنم عائلية مع سلطة وحلويات بسعر خاص. اطلبها قبل 24 ساعة وبنوصلها لين باب البيت.',
    targetAudience: 'عملاء الولائم والديوانيات المتكررون',
    timing: 'الثلاثاء مساءً لطلبات الخميس',
    expectedOutcome: 'زيادة متوقعة في طلبات الولائم المسبقة بحدود 15-20٪ (تقدير تجريبي).',
  };
  return JSON.stringify(plan);
}

// --------------------------------------------------------------- dispatcher

export function demoAiResponse(pathname: string, method: string, body: Body): unknown | null {
  if (method.toUpperCase() !== 'POST') return null;

  switch (pathname) {
    case '/api/ai/assistant':
      return { success: true, demo: true, text: assistantReply(body.message) };

    case '/api/ai/quick-messages':
      return { success: true, demo: true, messages: QUICK_MESSAGES[String(body.category)] || QUICK_MESSAGES.engagement };

    case '/api/ai/marketing-campaign':
      return { success: true, demo: true, text: marketingCampaignText() };

    case '/api/ai/ceo-copilot/explain':
      return { success: true, demo: true, narrative: {
        summary: 'الصورة العامة مستقرة: المبيعات جيدة والخطر الأساسي في الطلبات المعلقة وأرصدة الموردين. (شرح تجريبي محلي)',
        executiveOrder: 'اليوم: تابع الطلبات بانتظار الدفع، ثم راجع أعلى مورد رصيداً قبل نهاية الأسبوع.',
      } };

    case '/api/ai/ceo-copilot/whatsapp-draft': {
      const name = String(body?.context?.customerName || 'عميلنا الكريم');
      return { success: true, demo: true, draft: `حياك الله ${name} 🌿 نشكرك على ثقتك بمطبخ التراث الكويتي. نحب نطمّن عليك ونعرض عليك الأنسب لعزيمتك الجاية، تأمر على شي؟` };
    }

    case '/api/ai/ceo-copilot/campaign-flow': {
      const name = String(body?.product?.name || 'مجبوس دجاج عائلي');
      return { success: true, demo: true,
        idea: `حملة قصيرة تبرز ${name} كخيار الجمعة العائلية.`,
        copy: { hook: `${name}.. غداء الجمعة محلول`, body: 'طبق مشبع يكفي العائلة، مجهز طازج ويوصل لين باب البيت.', cta: 'اطلب الآن عبر واتساب' },
        storyboard: [
          { scene: 1, text: 'لقطة قريبة لبخار الطبق' },
          { scene: 2, text: 'فتح العلبة على سفرة عائلية' },
          { scene: 3, text: 'لقطة ختامية مع رسالة الطلب' },
        ] };
    }

    case '/api/ai/ceo-copilot/supplier-intel': {
      const name = String(body?.supplier?.name || 'المورد');
      return { success: true, demo: true,
        findings: ['فاتورتان بدون رقم مرجعي واضح', 'فرق بسيط بين سعر الاستلام وسعر الفاتورة'],
        explanation: `${name}: المستندات ناقصة قليلاً ويُفضّل استكمالها قبل أي دفعة جديدة.`,
        action: 'اطلب من المورد إرسال المراجع الناقصة ثم أكّد الدفعة.' };
    }

    case '/api/smart-studio/text-ideas': {
      const prompt = String(body.prompt || '');
      if (/JSON/.test(prompt)) {
        return { success: true, demo: true, text: JSON.stringify({ name: 'ليالي الديرة', description: 'ثيم دافئ بألوان الرمل والذهب والنحاس يناسب أجواء الديوانية.', colors: ['#5b3a1e', '#c9962f', '#f6ead2'] }) };
      }
      return { success: true, demo: true, text: 'الجو اليوم يطلب أكلة دافية وسفرة عائلية 🌿\nمجبوس الدجاج جاهز ويوصلك بسرعة، اطلب الحين!' };
    }

    case '/api/smart-studio/generate':
    case '/api/smart-studio/generate-from-text': {
      const scene = pickScene(`${body.prompt || ''} ${body.theme || ''}`);
      const url = demoSceneImage(scene.label, scene.hue, scene.emoji, String(body.format || '1:1'), Math.floor(Math.random() * 4));
      return { success: true, demo: true, imageUrl: url };
    }

    case '/api/smart-studio/generate-reel': {
      const scene = pickScene(String(body.prompt || ''));
      const secs = Math.min(8, Math.max(4, Number(body.duration) || 6));
      return { success: true, demo: true, videoUrl: demoReelMotion(scene.label, scene.hue, scene.emoji, secs), posterUrl: demoSceneImage(scene.label, scene.hue, scene.emoji, '9:16') };
    }

    case '/api/smart-studio/recommend-scene':
      return { success: true, demo: true, productType: 'طبق رز ولحم', reason: 'الصورة تظهر طبقاً رئيسياً دافئاً مناسباً لمشهد توصيل عائلي.', place: 'delivery', pulseId: 'quick-kuwait', mode: 'finalBoss', background: 'delivery-packaging', mood: 'دافئ', themeHint: 'طلب توصيل مرتب على سفرة بيت', confidence: 88 };

    case '/api/smart-studio/live-director':
      return { success: true, demo: true, productType: 'طبق كويتي', reason: 'مشهد توصيل دافئ يبرز الطبق ويعطي إحساس الطلب الحقيقي.', place: 'delivery', pulseId: 'quick-kuwait', mode: 'finalBoss', background: 'delivery-packaging', mood: 'دافئ', shot: 'steam-close', format: '1:1', confidence: 90, directorNote: 'المخرج الذكي (تجريبي): اخترنا لقطة قريبة للبخار مع خلفية توصيل.' };

    case '/api/smart-studio/reality-audit':
      return { success: true, demo: true, score: 96, verdict: 'واقعية ممتازة (تقييم تجريبي)', notes: ['إضاءة طبيعية', 'ظلال تلامس مقنعة', 'لا نصوص أو شعارات داخل الصورة'], fixHint: '', publishReady: true, dishLocked: true, hasTextOrLogo: false, instagramReady: true, subscores: { dishLock: 96, realism: 95, textSafety: 100, instagramFit: 94, appetite: 96 } };

    case '/api/smart-studio/reel-quality-audit':
      return { success: true, demo: true, score: 96, verdict: 'ريل جاهز للنشر (فحص تجريبي)', notes: ['حركة هادئة', 'بدون نصوص مزعجة'], fixHint: '', publishReady: true, dishLocked: true, hasTextOrLogo: false, instagramReady: true, subscores: { dishLock: 96, realism: 95, textSafety: 100, instagramFit: 95, appetite: 96 } };

    default:
      return null;
  }
}
