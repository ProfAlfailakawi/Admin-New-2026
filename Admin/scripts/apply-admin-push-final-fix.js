const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.ts");
if (!fs.existsSync(serverPath)) {
  console.error("ERROR: server.ts not found. Run from admin project root.");
  process.exit(1);
}

let text = fs.readFileSync(serverPath, "utf8");
let changed = false;

function replaceOnce(label, oldText, newText) {
  if (text.includes(newText)) {
    console.log("OK already:", label);
    return;
  }
  if (text.includes(oldText)) {
    text = text.replace(oldText, newText);
    changed = true;
    console.log("OK applied:", label);
  } else {
    console.log("SKIP not found:", label);
  }
}

// Add server-side new order pending alert before the working 10-minute unpaid block.
const newOrderBlock = `      // 0) طلب جديد بانتظار الدفع - server-side, works even if admin app is closed
      for (const order of orders) {
        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = \`order-created-\${(order as any).id}\`;

        if (await alreadySent(eventId)) {
          continue;
        }

        const orderNumber = getOrderNumber(order, (order as any).id);
        const total = getTotal(order);

        const result = await sendSmartAlertPushNotification({
          title: "🚨 طلب جديد بانتظار الدفع",
          body: \`طلب \${orderNumber} وصل الآن بانتظار الدفع\${total ? \` — القيمة \${total.toFixed(3)} د.ك\` : ""} ⏳\`,
          alertType: "new_order_pending_payment",
          url: \`/?order=\${encodeURIComponent((order as any).id)}\`
        });

        await markSent(eventId, {
          type: "order_created_pending_payment_server",
          orderId: (order as any).id,
          orderNumber,
        }, result);

        results.push({ eventId, result });
      }

`;

if (!text.includes("order_created_pending_payment_server")) {
  const marker = "      // 1) طلب لم يدفع بعد 10 دقائق";
  if (text.includes(marker)) {
    text = text.replace(marker, newOrderBlock + marker);
    changed = true;
    console.log("OK inserted server-side new order pending alert.");
  } else {
    console.log("SKIP marker not found: 10-minute unpaid block.");
  }
} else {
  console.log("OK already: server-side new order pending alert.");
}

replaceOnce(
  "create-payment new order push await",
`      sendSmartAlertPushNotification({
        title: "🆕 طلب جديد بانتظار الدفع",
        body: \`طلب جديد \${invoiceId || orderId || "بدون رقم"} بقيمة \${amount} د.ك — بانتظار إتمام الدفع\`,
        alertType: "new_order_pending_payment",
        url: \`/?invoice=\${invoiceId || orderId || ""}\`
      }).then((result) => {
        console.log("[NEW ORDER PUSH] result:", result);
      }).catch((error) => {
        console.error("[NEW ORDER PUSH] failed:", error);
      });

      res.json(data);`,
`      try {
        const pushResult = await sendSmartAlertPushNotification({
          title: "🆕 طلب جديد بانتظار الدفع",
          body: \`طلب جديد \${invoiceId || orderId || "بدون رقم"} بقيمة \${amount} د.ك — بانتظار إتمام الدفع\`,
          alertType: "new_order_pending_payment",
          url: \`/?invoice=\${invoiceId || orderId || ""}\`
        });
        console.log("[NEW ORDER PUSH] result:", pushResult);
      } catch (pushError) {
        console.error("[NEW ORDER PUSH] failed:", pushError);
      }

      res.json(data);`
);

replaceOnce(
  "payment failed invoice await",
`                    sendSmartAlertPushNotification({
                      title: "❌ فشل دفع فاتورة",
                      body: \`الفاتورة \${orderId} فشل دفعها — راجعوا الطلب وأعيدوا إرسال الرابط عند الحاجة\`,
                      alertType: "payment_failed",
                      url: \`/?invoice=\${orderId}\`
                    }).catch(console.error);`,
`                    try {
                      const pushResult = await sendSmartAlertPushNotification({
                        title: "❌ فشل دفع فاتورة",
                        body: \`الفاتورة \${orderId} فشل دفعها — راجعوا الطلب وأعيدوا إرسال الرابط عند الحاجة\`,
                        alertType: "payment_failed",
                        url: \`/?invoice=\${orderId}\`
                      });
                      console.log("[PAYMENT FAILED PUSH] invoice result:", pushResult);
                    } catch (pushError) {
                      console.error("[PAYMENT FAILED PUSH] invoice failed:", pushError);
                    }`
);

replaceOnce(
  "payment failed order await",
`                        sendSmartAlertPushNotification({
                          title: "❌ فشل دفع طلب",
                          body: \`الطلب \${orderId} فشل دفعه — يحتاج متابعة\`,
                          alertType: "payment_failed",
                          url: \`/?invoice=\${orderId}\`
                        }).catch(console.error);`,
`                        try {
                          const pushResult = await sendSmartAlertPushNotification({
                            title: "❌ فشل دفع طلب",
                            body: \`الطلب \${orderId} فشل دفعه — يحتاج متابعة\`,
                            alertType: "payment_failed",
                            url: \`/?invoice=\${orderId}\`
                          });
                          console.log("[PAYMENT FAILED PUSH] order result:", pushResult);
                        } catch (pushError) {
                          console.error("[PAYMENT FAILED PUSH] order failed:", pushError);
                        }`
);

if (changed) {
  fs.writeFileSync(serverPath, text);
  console.log("DONE: server.ts updated.");
} else {
  console.log("DONE: no changes needed or patterns already applied.");
}
