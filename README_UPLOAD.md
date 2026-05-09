# Latest Admin Push Fixes + rawStatus fix

## المسارات داخل ZIP

```text
public/firebase-messaging-sw.js
scripts/apply-latest-admin-push-fixes.js
README_UPLOAD.md
FILE_TREE.txt
```

## طريقة التطبيق

فك الضغط داخل جذر مشروع الأدمن، ثم شغل:

```bash
node scripts/apply-latest-admin-push-fixes.js
```

بعدها تحقق:

```bash
grep -n "rawStatus\|statusText\|order-created-\|payment-failed-\|payment-paid-\|paidStatusText" server.ts
```

المهم: لا يظهر `rawStatus` كمتغير مستخدم داخل `markSent`. يجب أن يكون:

```text
status: statusText
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
