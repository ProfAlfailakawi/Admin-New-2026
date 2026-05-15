# Admin Push Final Fix

## ماذا تحتوي الحزمة؟

- `public/firebase-messaging-sw.js`
- `scripts/apply-admin-push-final-fix.js`

## طريقة الاستخدام

فك الضغط داخل جذر مشروع الأدمن ثم شغل:

```bash
node scripts/apply-admin-push-final-fix.js
```

بعدها اختبر تشغيل السيرفر:

```bash
npx tsx server.ts
```

ثم ارفع للإنتاج واعمل deploy/restart.

## ماذا تعدل؟

- تضيف/تثبت إشعار: `🚨 طلب جديد بانتظار الدفع`
- تجعل إشعار طلب جديد في `/api/create-payment` يستخدم `await`
- تجعل إشعارات فشل الدفع تستخدم `await`
- لا تغير إشعار `⏳ طلب لم يُدفع بعد` لأنه شغال بالفعل

## مهم

لا ترفع:
`Use Secret Manager / environment variables only. Do not store service account keys in the repository.`
