# Admin + Partner Deeplink Final Patch

هذا ZIP يحفظ نفس التعديل الأخير الشغال من فولدر `New`:

- Admin + Partner
- INV + ORD
- PWA notification click
- `/track` القديم
- يفتح `invoices-list`
- يفتح `ReportsPage`
- يفتح تبويب `invoices`
- يبحث بالرقم الكامل
- يمسح الرابط من العنوان بعد الفتح حتى تستطيع الضغط على Home وأي زر آخر طبيعي

## الاستخدام من جذر المشروع

```bash
node scripts/apply-admin-partner-deeplink-final.cjs
```

## التحقق

```bash
grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo OK

grep -n "setCurrentPage('track')\|setCurrentPage(\"track\")\|searchParams.get('invoice')\|searchParams.get(\"invoice\")" src/App.tsx || echo OK

grep -n "REPORTS_PAGE_DIRECT_URL_DEEPLINK\|reportsPushDeepLinkHandled\|React.React.useEffect\|React.useEffect" src/components/ReportsPage.tsx | head -80
```

## الرفع

```bash
npm run build
firebase deploy --only hosting --project gen-lang-client-0878573239
```

لا يحتاج Cloud Run.
