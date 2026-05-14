# DeliveryHeatMapKuwait — SVG + Projection

## المطلوب
هذه الحزمة جاهزة للمبرمج حتى يركّب خريطة الكويت كخلفية SVG ويضع فوقها نقاط طلبات التوصيل حسب `invoice.address.region`.

## الملفات والمسارات المقترحة

```txt
/public/maps/kuwait-delivery-map.svg
/src/lib/kuwait-map-projection.js
/src/data/kuwait-areas.json
/src/components/DeliveryHeatMapKuwait.jsx
```

## فكرة الربط

1. الفاتورة فيها:
```js
invoice.address.region
```

2. النظام يبحث عن المنطقة داخل:
```js
kuwait-areas.json
```

3. يأخذ `lat/lng`.

4. يحوّل الإحداثيات إلى `x/y` داخل SVG باستخدام:
```js
lonLatToKuwaitSvgPoint(lng, lat)
```

5. يرسم Bubble / Pin فوق الخريطة.

## ملاحظة مهمة للمبرمج

لا تغيّر `viewBox="0 0 1000 1000"` في ملف SVG إلا إذا عدّلت معاه ملف:
```txt
kuwait-map-projection.js
```

لأن محاذاة النقاط تعتمد على نفس نظام الإحداثيات.

## ماذا تعرض الخريطة؟

الخريطة مناسبة لفكرة مطعم ومطبخ يوصّل أكل فقط:

- عدد الطلبات حسب المنطقة.
- إجمالي المبيعات حسب المنطقة.
- المناطق النشطة.
- المناطق الضعيفة التي تحتاج عروض.
- Bubble أكبر = طلبات أكثر.
- Tooltip يعرض المنطقة، عدد الطلبات، وإجمالي المبيعات.

## ملاحظة حول الدقة

ملف SVG مصمم كخريطة تشغيلية جميلة ومناسبة للداشبورد. دقة إسقاط النقاط تعتمد على صحة `kuwait-areas.json` وعلى ثبات نفس الـ projection الموجود في هذه الحزمة.
