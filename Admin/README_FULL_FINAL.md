# ALTURATH FULL FINAL PATCH

هذا ZIP واحد شامل كل شيء اشتغلنا عليه اليوم باحترافية:

## يشمل

### 1) إشعارات الأدمن / العميل

ORD:
- طلب جديد
- لم يدفع بعد 10 دقائق
- فشل الدفع
- تم الدفع

INV:
- فاتورة جديدة
- لم تدفع بعد 10 دقائق
- فشل الدفع
- تم الدفع

عام:
- ملخص اليوم
- المبيعات فوق 200
- ضغط الطلبات
- منع التكرار
- data-only
- أحدث توكن واحد
- eventId/tag لكل إشعار
- Cloud Scheduler / run-business-alerts

### 2) ضغط الإشعار PWA

يفتح مباشرة:

```text
?invoice=INV-... → ReportsPage → invoices → بحث بالرقم كامل
?order=ORD-...   → ReportsPage → invoices → بحث بالرقم كامل
/track?tracked_order=... → نفس المنطق
```

## طريقة الاستخدام من جذر المشروع

```bash
node scripts/apply-alturath-full-final-patch.cjs
```

ثم تحقق:

```bash
grep -n "notification:" server.ts || echo "OK: no notification payload"

grep -n "business-order-created\|payment-pending-10min\|payment-failed-\|payment-paid-" server.ts

grep -n "invoice-created-\|invoice-pending-10min\|invoice-failed-\|invoice-paid-" server.ts

grep -n "DEEP_LINK_DEBUG" src/App.tsx src/components/ReportsPage.tsx || echo "OK: no debug logs"

grep -n "searchParams.has('invoice')\|searchParams.has(\"invoice\")\|searchParams.get('invoice')\|searchParams.get(\"invoice\")\|setCurrentPage('track')\|setCurrentPage(\"track\")" src/App.tsx || echo "OK: no old track hijack"
```

## الرفع

لأن هذا ZIP يشمل Frontend + Backend:

### Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Cloud Run

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

## ملاحظات مهمة

- لا ترفع `secrets/serviceAccountKey.json`
- إذا المشروع `"type": "module"` وشغّلت سكربت `.js` ورفض `require`، شغّل السكربت الرئيسي `.cjs`:
  ```bash
  node scripts/apply-alturath-full-final-patch.cjs
  ```
- بعد الرفع جرّب:
  ```text
  https://admin.alturathkw.shop/?invoice=INV-1778372934783-JX6Y
  https://admin.alturathkw.shop/?order=ORD-1778514977189-C23P
  ```
