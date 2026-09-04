# Manual server.ts patch

ابحث في server.ts عن الكتلة التي تبدأ تقريبًا بـ:

```ts
const message: any = {
  tokens,
  notification: ...
```

واستبدل كتلة message القديمة بهذه الكتلة:

```ts
      const title = testNotificationOnly
        ? "اختبار طلب جديد"
        : "✅ طلب مدفوع جديد";

      const body = testNotificationOnly
        ? "هذا اختبار إشعار بالخلفية"
        : `تم دفع الطلب ${orderNumber || orderId} — القيمة ${String(total)} د.ك. جهزوا الطلب يا أبطال 🔥`;

      const finalUrl = testNotificationOnly
        ? "https://admin.alturathkw.shop/?invoice=ord_123"
        : url;

      const message: any = {
        tokens,
        data: {
          title: String(title),
          body: String(body),
          type: testNotificationOnly ? "test_notification" : "new_order",
          orderId: String(orderId || ""),
          restaurantId: String(restaurantId || "kitchen_default"),
          orderNumber: String(orderNumber || ""),
          total: String(total || ""),
          url: String(finalUrl),
          icon: "https://admin.alturathkw.shop/icons/icon-192.png",
          badge: "https://admin.alturathkw.shop/icons/icon-192.png",
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          fcmOptions: { link: finalUrl },
        },
      };
```
