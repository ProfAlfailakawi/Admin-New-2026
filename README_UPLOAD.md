# Final Admin Push Fix - No Duplicates

## المسارات

```text
public/firebase-messaging-sw.js
scripts/apply-final-admin-push-fix.js
README_UPLOAD.md
FILE_TREE.txt
```

## ماذا يشمل؟

- يمنع التكرار نهائيًا عبر `claimPushEvent` في `pushEvents`
- يرسل فقط للطلبات الحديثة خلال آخر 20 دقيقة
- يدعم `appData/shared_company_data.orders`
- يدعم `status: "جديد"` كطلب جديد
- يدعم `paymentStatus: "failed"` و `status: "فشل في عملية الدفع"`
- يدعم `paid`
- يقلل تنبيه ضغط الطلبات إلى مرة كل ساعتين
- Service Worker بإعدادات Firebase الصحيحة `951671626657`

## التطبيق

فك الضغط داخل جذر مشروع الأدمن ثم شغل:

```bash
node scripts/apply-final-admin-push-fix.js
```

تحقق:

```bash
grep -n "claimPushEvent\|20 \* 60 \* 1000\|payment-failed-\|payment-paid-\|payment-pending-10min-\|order-created-" server.ts
```

ثم ارفع/انشر:

```text
server.ts
public/firebase-messaging-sw.js
```

واعمل restart/deploy للإنتاج.

## مهم للإنتاج

Environment Variable:

```text
ADMIN_TEST_SECRET=قيمة_سرية
```

والـcron أو المستدعي لازم يرسل:

```text
x-admin-secret: نفس_القيمة
```

لا ترفع:

```text
secrets/serviceAccountKey.json
```
