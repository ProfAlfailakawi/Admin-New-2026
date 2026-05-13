# Admin2026 Safe Recovery Patch

هذا ZIP مخصص للنسخة الحالية بعد نسخ `server.ts` القديم إلى `Admin2026`.

يعالج:
- `/api/payment-return/INV.../failed` الذي يعطي API Route Not Found
- فشل/دفع INV و ORD
- mirror للـ INV داخل orders حتى يظهر في Track
- تعطيل إشعارات "جديد" المكررة
- data-only push بدون `notification:`
- ضغط الإشعار يقرأ `data.url` و `FCM_MSG.data.url`

## الاستخدام من جذر Admin2026

```bash
node scripts/apply-admin2026-recovery-safe.cjs
```

## التحقق

```bash
grep -n "ADMIN2026_SAFE_EXPLICIT_PAYMENT_RETURN\|NEW_ORDER_ALERT_DISABLED_SAFE_RECOVERY\|DISABLED_NEW_ALERT_TYPES" server.ts
grep -n "notification:" server.ts || echo "OK: no notification payload"
grep -n "notificationclick\|urlToOpen\|FCM_MSG" public/firebase-messaging-sw.js
```

## الرفع

```bash
npm run build
firebase deploy --only hosting --project gen-lang-client-0878573239
```

ثم:

```bash
npx tsx server.ts
```

إذا ظهر `Server running on http://localhost:3000` اضغط Ctrl+C، ثم:

```bash
gcloud run deploy service \
  --source . \
  --region europe-west2 \
  --project gen-lang-client-0878573239 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_TEST_SECRET=123456

gcloud run services update-traffic service \
  --region europe-west2 \
  --project gen-lang-client-0878573239 \
  --to-latest
```
