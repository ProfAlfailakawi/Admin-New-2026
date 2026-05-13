# ALTURATH COMPLETE FINAL — Notifications + Latest Click Fix

هذا هو الملف الواحد المطلوب:

- الإشعارات الكاملة
- آخر إصلاح ضغط الإشعار للأدمن والشريك
- INV + ORD
- /track القديم
- Home يعمل بعد الضغط

## الاستخدام

من جذر المشروع:

```bash
node scripts/apply-alturath-complete-final.cjs
```

ثم:

```bash
npm run build
firebase deploy --only hosting --project gen-lang-client-0878573239
```

إذا احتجت منطق backend للإشعارات من `server.ts`:

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

السكربت يطبق الملف الشامل أولًا، ثم يطبق آخر إصلاح ضغط الإشعار بعده، وهذا هو الترتيب الصحيح.
