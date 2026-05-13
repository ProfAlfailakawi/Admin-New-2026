# Admin UI CSS / Cache Fix

هذا التصحيح مخصص لمشكلة ظهور الواجهة بدون ستايل أو بشكل مكسور بعد الرفع.

لا يلمس:
- Cloud Run
- server.ts
- الإشعارات
- التوكنات
- Scheduler

## الاستخدام من جذر مشروع الأدمن

```bash
node scripts/apply-admin-ui-css-cache-fix.cjs
```

ثم:

```bash
npm run build
firebase deploy --only hosting --project gen-lang-client-0878573239
```

## ماذا يفعل؟

- يتأكد أن ملف CSS الرئيسي مستورد في `src/main.tsx`.
- يضيف headers في `firebase.json` حتى لا يتم كاش `index.html` و `firebase-messaging-sw.js`.
- يحافظ على كاش `/assets/**` لأنها ملفات hashed.
- يحذف أي debug logs مؤقتة من App/ReportsPage.

## الاختبار

افتح:

```text
https://admin.alturathkw.shop/?invoice=INV-1778372934783-JX6Y&v=cssfix
https://admin.alturathkw.shop/?order=ORD-1778514977189-C23P&v=cssfix
```
