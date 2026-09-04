# Final PWA Deep Link Patch

يشغل ضغط الإشعار من PWA مباشرة على:

```text
ReportsPage → invoices tab → البحث بالرقم الكامل
```

يدعم:

```text
?invoice=INV-...
?order=ORD-...
/track?tracked_order=INV-...
/track?tracked_order=ORD-...
```

## الاستخدام من جذر المشروع

```bash
node scripts/apply-final-pwa-deeplink-patch.cjs
```

## التحقق

```bash
grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo OK
grep -n "searchParams.has('invoice')\|searchParams.has(\"invoice\")\|searchParams.get('invoice')\|searchParams.get(\"invoice\")\|setCurrentPage('track')\|setCurrentPage(\"track\")" src/App.tsx || echo OK
grep -n "reportsPushDeepLinkHandled\|React.useEffect\|deepLinkData" src/components/ReportsPage.tsx | head -40
```

## الرفع

```bash
npm run build
firebase deploy --only hosting
```

Cloud Run غير مطلوب إلا إذا كان `server.ts` ما زال يرسل روابط نسبية قديمة.
