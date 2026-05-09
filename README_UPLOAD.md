# ملفات الرفع لمسارات مشروع الأدمن

ارفع محتويات هذا ZIP داخل جذر مشروع الأدمن.

## المسارات داخل المشروع

```text
public/firebase-messaging-sw.js
scripts/apply-admin-push-fixes.js
README_UPLOAD.md
```

## خطوات التطبيق

من جذر مشروع الأدمن شغل:

```bash
node scripts/apply-admin-push-fixes.js
```

هذا السكربت يعدل ملف:

```text
server.ts
```

بعدها ارفع/انشر:

```text
server.ts
public/firebase-messaging-sw.js
```

ثم اعمل build/restart/deploy حسب الاستضافة.

## مهم جدًا

لا ترفع ملف الصلاحيات داخل public أو GitHub:

```text
secrets/serviceAccountKey.json
```

إذا الإنتاج يحتاج Firebase credentials، ضعه كـ Secret/Environment Variable آمن في لوحة الاستضافة.
