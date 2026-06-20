// Web Worker مخصص لضغط نسخة المرآة المحلية (offline snapshot) خارج الخيط الرئيسي.
// السبب: ضغط LZString لنص بحجم عشرات الميغابايت يستغرق ثوانٍ طويلة (~14 ثانية على 30MB)
// ولو جرى على الخيط الرئيسي يجمّد الواجهة بالكامل عند الدخول. هنا يجري في خيط منفصل
// فتبقى الواجهة سريعة (القائمة/الفاتورة الجديدة) دون أي انتظار.
//
// هذا الملف لا علاقة له بالسحابة كمصدر حقيقة، ولا بالدفع/الإشعارات/الذكاء/الدخول/القاعدة.
// إنه فقط يضغط نصًا ويعيده.
import LZString from 'lz-string';

self.onmessage = (event: MessageEvent) => {
  const { id, text } = (event.data || {}) as { id?: number; text?: string };
  // نُعيد base64 خام (بلا أي بادئة) ليستخدمه المنادي كما يناسبه:
  //  - نسخة المرآة المحلية تضيف 'lz64:' قبله.
  //  - حفظ الـshards للسحابة يستخدمه مباشرةً داخل { compressedData }.
  let result: string | null = null;
  try {
    if (typeof text === 'string' && text.length > 0) {
      result = LZString.compressToBase64(text);
    }
  } catch {
    result = null;
  }
  // نعيد المعرّف نفسه ليتمكن الطرف الرئيسي من مطابقة الطلب بالنتيجة.
  (self as unknown as Worker).postMessage({ id, result });
};
