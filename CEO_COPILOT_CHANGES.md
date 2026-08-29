# CEO Copilot — ملخص التغيير

## السبب الجذري
مكوّن `CEOCopilot.tsx` وطبقة الأرقام المقفلة `ceo-copilot.ts` كانا موجودين من جلسة سابقة **لكن ميّتين**:
1. الـendpoint الذي تناديه الواجهة `/api/ai/ceo-copilot/explain` **غير موجود** في `server.ts` → زر «رتّب القرار بـGemini» يسقط دائمًا على الترتيب المحلي.
2. `CEOCopilot` **غير مُسجّل** في `App.tsx` (لا route ولا عنصر منيو) → لا يمكن الوصول إليه داخل التطبيق أصلًا.

النتيجة: طبقة القائد كانت كود غير مفعّل. هذا التحديث يُحييها production-grade مع الحفاظ على مبدأ **Numbers Locked** (Gemini يفسّر ويرتّب فقط، ولا يُنتج أي رقم مالي).

## مبدأ الأمان (لم يُكسر)
- كل الأرقام تُبنى في العميل عبر `buildCEOCopilotSnapshot` من business logic الحقيقي.
- Gemini يستقبل الـsnapshot ويختار **IDs فقط** عبر Structured Outputs (`responseSchema`).
- السيرفر يتحقق أن كل ID يعود فعليًا لعنصر في الـsnapshot، ويرمي أي ID مخترع → يستحيل على النموذج إخراج رقم جديد.
- كل الأقسام ذات الأثر الخارجي (واتساب/الحملة) بحالة `needs_human_approval` بدون إرسال أو نشر تلقائي.

## الملفات المعدّلة / المضافة
1. **server.ts** — (import: أضيف `Type`) + 4 endpoints جديدة قبل `/api/ai/pulse-archive`:
   - `POST /api/ai/ceo-copilot/explain` — ترتيب القرارات وتفسير الشذوذ (Structured Outputs + تحقّق IDs على السيرفر).
   - `POST /api/ai/ceo-copilot/whatsapp-draft` — مسودة واتساب نصية، اعتماد بشري، لا إرسال.
   - `POST /api/ai/ceo-copilot/supplier-intel` — ذكاء مورد/مستند (File Search خفيف: يحلّل نص مستند مُلصق أو الفجوات المسجّلة).
   - `POST /api/ai/ceo-copilot/campaign-flow` — payload حملة جاهز لـFlow (فكرة→copy→storyboard→imagePrompts).
   - كلها تتبع نمط المشروع: مفتاح `GEMINI_API_KEY` اختياري مع fallback محلي كامل.
2. **App.tsx** — إحياء الربط:
   - `lazy import` لـ`CEOCopilot`.
   - `case 'ceo-copilot'` في switch الرئيسي.
   - عنصر منيو ضمن `coreModules` + عنوان صفحة في خريطة العناوين.
3. **src/components/CEOCopilot.tsx** — تكاملات حقيقية جديدة (الأرقام تبقى من snapshot):
   - «حسّن بـGemini» لمسودات واتساب.
   - «حلّل الفجوات» لذكاء المورد + عرض النتائج.
   - «ولّد payload الحملة» + عرض/نسخ payload جاهز لـFlow.
4. **src/lib/ceo-copilot.ts** — (مرفق كما هو، غير معدّل) مصدر الأرقام المقفلة والحارس `coerceCopilotNarrative`.

## التحقق
- توازن الأقواس/الوسوم مفحوص في الملفات المعدّلة (parens/braces/brackets = 0).
- `@google/genai` v1.52 يُصدّر `Type` قياسيًا لـ`responseSchema`.
- ملاحظة صريحة: `node_modules` غير مثبّت في بيئة التنفيذ هنا، لذلك **لم أستطع تشغيل `tsc`/build محليًا**. شغّل build المعتاد لديك قبل النشر.
