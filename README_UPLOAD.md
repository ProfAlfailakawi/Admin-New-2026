# Complete Admin Push Fixes

## ماذا يحتوي هذا ZIP؟

```text
public/firebase-messaging-sw.js
scripts/apply-complete-admin-push-fixes.js
README_UPLOAD.md
FILE_TREE.txt
```

## هل هذا فقط لتعديل "طلب جديد"؟

لا. هذا يشمل كل التعديلات الأخيرة:

- دعم حقل `date` في طلبات `appData/shared_company_data.orders`
- اعتبار `status: "جديد"` كطلب جديد/بانتظار الدفع
- كشف `cancelled` كفشل/إلغاء دفع
- كشف `paid` كنجاح دفع
- إصلاح `rawStatus -> statusText`
- تقليل تكرار تنبيه "آخر ساعة فيها طلبات"
- ملف Service Worker بإعدادات Firebase الصحيحة:
  - messagingSenderId: `951671626657`

## طريقة التطبيق

فك الضغط داخل جذر مشروع الأدمن، ثم شغل:

```bash
node scripts/apply-complete-admin-push-fixes.js
```

بعدها تحقق:

```bash
grep -n "getDateValue((order as any).date)\|status.includes("جديد")\|payment-failed-\|payment-paid-\|paidStatusText\|rawStatus" server.ts
```

ثم ارفع/انشر:

```text
server.ts
public/firebase-messaging-sw.js
```

واعمل restart/deploy للإنتاج.

## مهم

لا ترفع:

```text
secrets/serviceAccountKey.json
```
