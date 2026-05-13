# ALL FINAL Admin Push Upload

## الملفات

```text
public/firebase-messaging-sw.js
scripts/apply-all-final-admin-push.js
README_UPLOAD.md
FILE_TREE.txt
```

## يشمل

- Service Worker نهائي بدون `addEventListener('push')`
- `server.ts` data-only بدون `notification:`
- منع التكرار عبر `pushEvents`
- أحدث push token واحد فقط
- `lastCheckedAt` + `businessSince` 15 دقيقة
- ORD:
  - طلب جديد
  - فشل الدفع
  - الدفع الناجح
  - لم يدفع بعد 10 دقائق
- INV:
  - فشل دفع فاتورة
  - تم دفع فاتورة
  - فاتورة لم تُدفع بعد 10 دقائق
- Debug:
  - `/api/debug/shared-invoice/:invoiceId`
  - `/api/debug/push-event/:eventId`

## التطبيق

```bash
cd ~/Downloads/New
node scripts/apply-all-final-admin-push.js
```

## التحقق

```bash
grep -n "notification:" server.ts
```

لازم لا يرجع شيء.

```bash
grep -n "claimPushEvent\|claimDirectInvoiceEvent\|slice(0, 1)\|lastCheckedAt: now.toISOString\|businessSince\|business-order-created\|invoice-failed-\|invoice-paid-\|invoice-pending-10min" server.ts
```

## النشر

```bash
gcloud run deploy service \
  --source . \
  --region europe-west2 \
  --project gen-lang-client-0878573239 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_TEST_SECRET=123456
```

ثم:

```bash
cp public/firebase-messaging-sw.js dist/firebase-messaging-sw.js
firebase deploy --only hosting
```

## مهم

لا ترفع:

```text
secrets/serviceAccountKey.json
```
