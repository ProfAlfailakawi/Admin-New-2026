# Latest Admin Push Fixes

## المسارات داخل ZIP

```text
public/firebase-messaging-sw.js
scripts/apply-latest-admin-push-fixes.js
README_UPLOAD.md
```

## طريقة التطبيق

فك الضغط داخل جذر مشروع الأدمن، ثم شغل:

```bash
node scripts/apply-latest-admin-push-fixes.js
```

بعدها تحقق:

```bash
grep -n "order-created-\|payment-failed-\|payment-paid-\|فشل في عملية الدفع\|paidStatusText" server.ts
```

ثم ارفع/انشر:

```text
server.ts
public/firebase-messaging-sw.js
```

واعمل restart/deploy للإنتاج.

## لا ترفع

```text
secrets/serviceAccountKey.json
```
