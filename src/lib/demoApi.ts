/**
 * Demo-only canned answers for read endpoints that screens call on load.
 * Used exclusively by installDemoNetworkGuard() — never reached outside demo mode.
 * Everything here is fictitious.
 */
import { GET_DEMO_DATA } from '../data';
import { demoAiResponse } from './demoAi';
const NOW = () => Date.now();
const ago = (minutes: number) => new Date(NOW() - minutes * 60000).toISOString();

type Thread = { ci: number; phone: string; name: string; mode: 'bot' | 'human'; status: string; unread: number; tags: string[]; msgs: Array<['in' | 'out', string, number]> };

const RAW_THREADS: Thread[] = [
  { ci: 1, phone: '55502000', name: 'خالد المطيري', mode: 'human', status: 'needs_support', unread: 2, tags: ['VIP'], msgs: [
    ['in', 'السلام عليكم، أبي أطلب وليمة غنم لـ ١٥ شخص يوم الخميس', 95], ['out', 'وعليكم السلام ورحمة الله، حياك الله. تأمر على شي ثاني؟', 92],
    ['in', 'هل تقدرون توصلونها قبل الساعة ٧ مساءً؟', 40], ['in', 'وكم السعر الإجمالي مع التوصيل للجابرية؟', 38] ] },
  { ci: 2, phone: '55502013', name: 'سارة الكندري', mode: 'bot', status: 'open', unread: 0, tags: [], msgs: [
    ['in', 'منيو', 300], ['out', 'أهلاً بك في مطبخ التراث الكويتي 🌿 هذا منيونا الكامل، تفضل اختار وأرسلي طلبك.', 299],
    ['in', 'تمام، أبغى ٢ مجبوس دجاج عائلي', 280], ['out', 'تم تسجيل طلبك ✅ رقم الطلب ORD-8120. رابط الدفع جاهز.', 279] ] },
  { ci: 3, phone: '55502026', name: 'محمد العجمي', mode: 'bot', status: 'open', unread: 1, tags: [], msgs: [
    ['in', 'وين طلبي؟ تأخر', 25], ['out', 'نعتذر عن التأخير، طلبك في الطريق وبيوصل خلال ١٥ دقيقة 🚚', 24], ['in', 'تمام شكراً', 20] ] },
  { ci: 4, phone: '55502039', name: 'نورة العتيبي', mode: 'human', status: 'open', unread: 0, tags: ['شكوى'], msgs: [
    ['in', 'الطلب وصل ناقص سلطة التبولة', 1500], ['out', 'نعتذر منك، بنرسل لك السلطة مع خصم ٢ د.ك على الطلب القادم 🙏', 1490], ['in', 'جزاكم الله خير', 1480] ] },
  { ci: 5, phone: '55502052', name: 'يوسف الدوسري', mode: 'bot', status: 'open', unread: 0, tags: [], msgs: [
    ['in', 'كم سعر المطبق الزبيدي؟', 2900], ['out', 'المطبق الزبيدي بلاتيني بسعر ٢٤.٥٠٠ د.ك ويكفي ٥-٦ أشخاص.', 2899] ] },
  { ci: 6, phone: '55502065', name: 'مريم الشمري', mode: 'bot', status: 'closed', unread: 0, tags: ['تم التقييم'], msgs: [
    ['in', 'شكراً الأكل كان ممتاز', 4300], ['out', 'الشكر لك! نرجو تقييم تجربتك من ١ إلى ٣ ⭐', 4290], ['in', '3', 4285] ] },
  { ci: 8, phone: '55502078', name: 'مجموعة الضيافة الكبرى', mode: 'human', status: 'needs_support', unread: 3, tags: ['شركات'], msgs: [
    ['in', 'نحتاج عرض سعر لـ ٥٠ صندوق غداء للموظفين أسبوعياً', 130], ['in', 'ونبي فاتورة شهرية', 128], ['in', 'متى نقدر نتواصل مع المسؤول؟', 120] ] },
  { ci: 9, phone: '55502091', name: 'عبدالرحمن الظفيري', mode: 'bot', status: 'open', unread: 0, tags: [], msgs: [
    ['in', 'هل عندكم توصيل للفحيحيل؟', 5800], ['out', 'نعم، نوصل لجميع مناطق الكويت. رسوم التوصيل ١.٥٠٠ د.ك.', 5799] ] },
];

// Names/phones come from the demo customers so every screen tells the same story.
let cachedThreads: Thread[] | null = null;
const threads = (): Thread[] => {
  if (cachedThreads) return cachedThreads;
  const customers = GET_DEMO_DATA().customers;
  cachedThreads = RAW_THREADS.map(t => ({ ...t, phone: customers[t.ci]?.phone || t.phone, name: customers[t.ci]?.name || t.name }));
  return cachedThreads;
};

const RULES = [
  { id: 'r1', title: 'طلب المنيو', enabled: true, priority: 1, keywords: ['منيو', 'قائمة', 'menu'], matchMode: 'any', action: 'products', response: 'أهلاً بك في مطبخ التراث الكويتي 🌿 هذا منيونا:' },
  { id: 'r2', title: 'ساعات العمل', enabled: true, priority: 2, keywords: ['دوام', 'مواعيد', 'ساعات'], matchMode: 'any', action: 'reply', response: 'نعمل يومياً من ٩ صباحاً حتى ١١ مساءً.' },
  { id: 'r3', title: 'رسوم التوصيل', enabled: true, priority: 3, keywords: ['توصيل', 'رسوم'], matchMode: 'any', action: 'reply', response: 'رسوم التوصيل ١.٥٠٠ د.ك داخل الكويت، ومجاناً للطلبات فوق ٦٠ د.ك.' },
  { id: 'r4', title: 'التحدث مع موظف', enabled: true, priority: 4, keywords: ['موظف', 'مسؤول', 'شكوى'], matchMode: 'any', action: 'human', response: 'جاري تحويلك لأحد موظفينا، لحظات 🙏' },
  { id: 'r5', title: 'الدفع', enabled: true, priority: 5, keywords: ['دفع', 'كي نت', 'knet'], matchMode: 'any', action: 'reply', response: 'نقبل الدفع عبر كي نت والرابط الإلكتروني والتحويل البنكي والكاش عند الاستلام.' },
  { id: 'r6', title: 'عروض الولائم', enabled: false, priority: 6, keywords: ['وليمة', 'عزيمة'], matchMode: 'any', action: 'reply', response: 'ولائمنا تبدأ من ٢٨ د.ك وتكفي ١٠ أشخاص، اطلبها قبل ٢٤ ساعة.' },
];

const BOT_TEXTS = [
  { key: 'greeting', label: 'رسالة الترحيب', hint: 'أول ما يكتب العميل', defaultText: 'أهلاً بك في مطبخ التراث الكويتي 🌿', value: 'أهلاً بك في مطبخ التراث الكويتي 🌿 تأمر على شي؟' },
  { key: 'order_received', label: 'تأكيد استلام الطلب', hint: 'بعد تسجيل الطلب', defaultText: 'تم تسجيل طلبك ✅', value: 'تم تسجيل طلبك ✅ وبنبلغك أول ما يجهز.' },
  { key: 'payment_link', label: 'رسالة رابط الدفع', hint: 'عند إرسال الرابط', defaultText: 'رابط الدفع الآمن:', value: 'رابط الدفع الآمن الخاص بطلبك:' },
  { key: 'out_for_delivery', label: 'الطلب في الطريق', hint: 'عند خروج السائق', defaultText: 'طلبك في الطريق 🚚', value: 'طلبك في الطريق 🚚 وبيوصلك قريب.' },
  { key: 'rating_request', label: 'طلب التقييم', hint: 'بعد التسليم', defaultText: 'قيّم تجربتك من ١ إلى ٣', value: 'نرجو تقييم تجربتك: ٣ ممتاز، ٢ جيد، ١ يحتاج تحسين ⭐' },
];

export function demoApiResponse(pathname: string, search: string, method: string, body?: any): unknown | null {
  const m = method.toUpperCase();
  const ai = demoAiResponse(pathname, m, body && typeof body === 'object' ? body : {});
  if (ai) return ai;

  // WhatsApp inbox actions: kept in memory only, so the inbox feels alive during a presentation.
  const actMatch = pathname.match(/^\/api\/whatsapp\/conversations\/([^/]+)\/(reply|mode|close|read|request-rating)$/);
  if (actMatch && m === 'POST') {
    const t = threads().find(x => x.phone === decodeURIComponent(actMatch[1]));
    if (!t) return { success: true, demo: true };
    const act = actMatch[2];
    if (act === 'reply') {
      const text = String(body?.text || '').trim();
      if (text) {
        t.msgs.push(['out', text, 0]);
        t.unread = 0;
        if (t.status === 'needs_support') t.status = 'open';
        // A short canned customer answer a moment later, so the thread visibly moves.
        const canned = ['تمام شكراً لكم 🌹', 'جزاكم الله خير', 'ممتاز، بانتظار طلبي'];
        setTimeout(() => { t.msgs.push(['in', canned[t.msgs.length % canned.length], 0]); t.unread += 1; }, 2500);
      }
    } else if (act === 'mode') {
      t.mode = body?.mode === 'human' ? 'human' : 'bot';
    } else if (act === 'close') {
      t.status = 'closed';
    } else if (act === 'read') {
      t.unread = 0;
    } else if (act === 'request-rating') {
      t.msgs.push(['out', 'نرجو تقييم تجربتك: ٣ ممتاز، ٢ جيد، ١ يحتاج تحسين ⭐', 0]);
    }
    return { success: true, demo: true };
  }
  if (pathname === '/api/whatsapp/conversations' && m === 'GET') {
    return { success: true, conversations: threads().map((t, i) => {
      const last = t.msgs[t.msgs.length - 1];
      const lastIn = [...t.msgs].reverse().find(x => x[0] === 'in');
      const lastOut = [...t.msgs].reverse().find(x => x[0] === 'out');
      return { id: t.phone, phone: t.phone, customerName: t.name, mode: t.mode, status: t.status, priority: t.status === 'needs_support' ? 'high' : 'normal', unreadCount: t.unread, lastMessageText: last[1], lastInboundText: lastIn?.[1], lastOutboundText: lastOut?.[1], lastMessageDirection: last[0] === 'in' ? 'inbound' : 'outbound', lastMessageAt: ago(last[2]), tags: t.tags, order: i };
    }) };
  }
  const msgMatch = pathname.match(/^\/api\/whatsapp\/conversations\/([^/]+)\/messages$/);
  if (msgMatch && m === 'GET') {
    const t = threads().find(x => x.phone === decodeURIComponent(msgMatch[1])) || threads()[0];
    return { success: true,
      conversation: { id: t.phone, phone: t.phone, customerName: t.name, mode: t.mode, status: t.status, unreadCount: 0, tags: t.tags },
      messages: t.msgs.map((x, i) => ({ id: `${t.phone}-${i}`, direction: x[0] === 'in' ? 'inbound' : 'outbound', text: x[1], type: 'text', sentBy: x[0] === 'in' ? 'customer' : (t.mode === 'human' ? 'agent' : 'bot'), status: 'read', createdAt: ago(x[2]) })),
      quickReplies: [
        { id: 'q1', title: 'شكر', text: 'الشكر لك، تأمر على شي ثاني؟' },
        { id: 'q2', title: 'وقت التوصيل', text: 'التوصيل خلال ٤٥-٦٠ دقيقة من تأكيد الطلب.' },
        { id: 'q3', title: 'اعتذار تأخير', text: 'نعتذر عن التأخير، طلبك في الطريق.' },
      ] };
  }
  if (pathname === '/api/whatsapp/backup' && m === 'GET') {
    const convs = threads();
    const messages = convs.flatMap(t => t.msgs.map((x, i) => ({ id: `${t.phone}-${i}`, phone: t.phone, direction: x[0] === 'in' ? 'inbound' : 'outbound', text: x[1], createdAt: ago(x[2]) })));
    return { success: true, demo: true, settings: { note: 'نسخة تجريبية - بيانات وهمية' },
      counts: { rules: RULES.length, ruleTemplates: 0, botTexts: BOT_TEXTS.length, ratings: 10, conversations: convs.length, messages: messages.length, systemQuickReplies: 3 },
      rules: RULES, ruleTemplates: [], botTexts: BOT_TEXTS, ratings: [],
      conversations: convs.map(t => ({ phone: t.phone, customerName: t.name, mode: t.mode, status: t.status })),
      messages, systemQuickReplies: [{ id: 'q1', title: 'شكر', text: 'الشكر لك، تأمر على شي ثاني؟' }] };
  }
  if (pathname === '/api/whatsapp/auto-replies' && m === 'GET') return { success: true, rules: RULES };
  if (pathname === '/api/whatsapp/bot-texts' && m === 'GET') return { success: true, texts: BOT_TEXTS };
  if (pathname === '/api/whatsapp/ratings' && m === 'GET') {
    const names = ['خالد المطيري', 'سارة الكندري', 'مريم الشمري', 'فهد الغانم', 'نورة العتيبي', 'جاسم الفليج', 'منى العيسى', 'بدر القحطاني', 'ليلى حسن', 'سعود العازمي'];
    const scores = [3, 3, 3, 2, 3, 3, 1, 3, 2, 3];
    const recent = names.map((name, i) => ({ name, score: scores[i], createdAt: ago(60 * 24 * (i + 1) * 2) }));
    const good = recent.filter(r => r.score === 3).length, ok = recent.filter(r => r.score === 2).length, bad = recent.filter(r => r.score === 1).length;
    return { success: true, count: recent.length, good, ok, bad, average: (recent.reduce((s, r) => s + r.score, 0) / recent.length).toFixed(1), recent };
  }
  if (pathname === '/api/whatsapp/bridge-status' && m === 'GET') {
    return { success: true, transport: 'bridge', bridge: { connected: true, account: '+965 5550 0111', minutesSinceSeen: 0, pollFailures: 0, reason: '', restartCanFix: false, lastPollOkAt: ago(0) } };
  }
  void search;
  return null;
}
