/** نص فحص الإشعارات: داخل تطبيق آيفون لا يُذكر المتصفح ولا Service Worker. */
export function pushHealthView(native: boolean) {
  return {
    subject: native ? "هذا الجهاز" : "هذا المتصفح",
    showServiceWorker: !native,
    needsActivation: native ? "يحتاج تفعيل من إعدادات الجهاز" : "يحتاج تفعيل من المتصفح",
    permissionDenied: native
      ? "الإشعارات غير مسموحة لهذا التطبيق. فعّلها من إعدادات الجهاز ثم اضغط فحص الآن."
      : "المتصفح الحالي لا يسمح بالإشعارات. فعّل الإذن ثم اضغط فحص الآن.",
    unsupported: native
      ? "الإشعارات غير متاحة على هذا الجهاز؛ حدّث التطبيق من App Store."
      : "هذا المتصفح لا يدعم إشعارات الويب بالكامل؛ جرّب من جهاز عميل فعلي.",
  };
}
