// Run from the project root with:
// node scripts/patch-server-notifications.js
//
// This patches server.ts so web push notifications are sent as data-only messages.
// The service worker then displays the notification. This helps PWA/iOS delivery/display.

const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.ts");

if (!fs.existsSync(serverPath)) {
  console.error("ERROR: server.ts not found. Run this from the project root.");
  process.exit(1);
}

let text = fs.readFileSync(serverPath, "utf8");

const oldBlock = `      const message: any = {
        tokens,
        notification: testNotificationOnly ? {
          title: "اختبار طلب جديد",
          body: "هذا اختبار إشعار بالخلفية"
        } : {
          title: "✅ طلب مدفوع جديد",
          body: \`تم دفع الطلب \${orderNumber || orderId} — القيمة \${String(total)} د.ك. جهزوا الطلب يا أبطال 🔥\`,
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          fcmOptions: { link: testNotificationOnly ? "https://admin.alturathkw.shop/?invoice=ord_123" : url },
          notification: {
            icon: "https://admin.alturathkw.shop/icons/icon-192.png",
            badge: "https://admin.alturathkw.shop/icons/icon-192.png",
            requireInteraction: true,
            vibrate: [200, 100, 200],
          },
        },
      };

      if (!testNotificationOnly) {
        message.data = {
          type: "new_order",
          orderId: String(orderId),
          restaurantId: String(restaurantId || "kitchen_default"),
          orderNumber: String(orderNumber),
          total: String(total),
          url,
        };
      }`;

const newBlock = `      const title = testNotificationOnly
        ? "اختبار طلب جديد"
        : "✅ طلب مدفوع جديد";

      const body = testNotificationOnly
        ? "هذا اختبار إشعار بالخلفية"
        : \`تم دفع الطلب \${orderNumber || orderId} — القيمة \${String(total)} د.ك. جهزوا الطلب يا أبطال 🔥\`;

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
      };`;

if (text.includes(newBlock)) {
  console.log("OK: server.ts already patched.");
  process.exit(0);
}

if (!text.includes(oldBlock)) {
  console.error("ERROR: Could not find the expected notification message block in server.ts.");
  console.error("Open PATCH_NOTES.md and apply the server.ts change manually.");
  process.exit(2);
}

text = text.replace(oldBlock, newBlock);
fs.writeFileSync(serverPath, text);
console.log("OK: server.ts patched to data-only push notifications.");
