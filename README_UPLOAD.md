# Final Stable Admin Push Files

## الملفات

```text
public/firebase-messaging-sw.js
scripts/apply-final-stable-admin-push.js
README_UPLOAD.md
FILE_TREE.txt
```

## يشمل آخر نسخة مستقرة

- Data-only FCM: لا يوجد `notification:` في `server.ts`
- Service Worker يعرض من `messaging.onBackgroundMessage` فقط
- لا يوجد `addEventListener('push')` في Service Worker
- `claimPushEvent` لمنع تكرار نفس الحدث
- إرسال لآخر push token واحد فقط
- ترتيب Firestore Timestamp صحيح للتوكنات
- `businessSince = lastCheckedAt - 5 minutes`
- تحديث `lastCheckedAt` بعد كل فحص ناجح
- دعم `appData/shared_company_data.orders`
- دعم `status: "جديد"`
- دعم `status: "فشل في عملية الدفع"` و `paymentStatus: "failed"`
- دعم `paid`
- `order_spike` كل ساعتين باستخدام `twoHourBucket`

## التطبيق

من جذر مشروع الأدمن:

```bash
node scripts/apply-final-stable-admin-push.js
```

تحقق:

```bash
grep -n "notification:" server.ts
grep -n "claimPushEvent\|slice(0, 1)\|lastCheckedAt: now.toISOString\|businessSince\|business-order-created" server.ts
```

الأمر الأول لازم لا يرجع شيئًا.

## النشر

Cloud Run:

```bash
gcloud run deploy service \
  --source . \
  --region europe-west2 \
  --project gen-lang-client-0878573239 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_TEST_SECRET=123456
```

Hosting:

```bash
cp public/firebase-messaging-sw.js dist/firebase-messaging-sw.js
firebase deploy --only hosting
```

## مهم

لا ترفع:

```text
secrets/serviceAccountKey.json
```
