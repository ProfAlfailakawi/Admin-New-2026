/**
 * Display-only Arabic wording for raw English values that reach the screen.
 * Stored values, keys and API payloads are never changed: components pass the raw
 * value through `arLabel()` at render time and anything unknown is returned as-is.
 */
const LABELS: Record<string, string> = {
  // Payment methods
  Cash: 'نقدي',
  BankTransfer: 'تحويل بنكي',
  Link: 'رابط دفع',
  // Marketing channels
  'Instagram Ads': 'إعلانات Instagram',
  'WhatsApp Direct': 'واتساب مباشر',
  'SMS Gateway': 'بوابة الرسائل النصية',
  'Email Blast': 'حملة بريد إلكتروني',
  // Push diagnostics placeholders and labels
  'Not registered': 'غير مسجل',
  'No timestamp saved': 'لا يوجد وقت محفوظ',
  'Not available': 'غير متاح',
  Unknown: 'غير معروف',
  'No platform': 'بلا منصة',
  'No token': 'بلا رمز',
  'Current browser': 'المتصفح الحالي',
  'First registration': 'أول تسجيل',
  'Last token update': 'آخر تحديث للرمز',
  'Last read/open': 'آخر قراءة أو فتح',
  'Push accepted/received': 'تم استلام الإشعار',
  'Push event recorded': 'تم تسجيل حدث الإشعار',
  'Last Registration': 'آخر تسجيل',
  'Service Worker': 'عامل الخدمة',
  'Current Browser Token': 'رمز المتصفح الحالي',
  'Push Notification': 'إشعار'
};

const MONTHS: Record<string, string> = {
  Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو',
  Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر'
};

/** An English formatted date/time such as "Oct 02, 2026, 05:24 AM" shown with Arabic month and ص/م. */
const localizeDateText = (value: string): string =>
  value
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m) => MONTHS[m])
    .replace(/\bAM\b/g, 'ص')
    .replace(/\bPM\b/g, 'م');

export const arLabel = (value: string | null | undefined): string => {
  if (value == null) return '';
  return LABELS[value] ?? (/\b(AM|PM)\b/.test(value) ? localizeDateText(value) : value);
};
