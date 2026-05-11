const payload = {
  amount: 2.5,
  customerName: "Test User",
  customerEmail: "volcanokw@gmail.com",
  customerMobile: "96599999999",
  orderId: "INV-123456",
  description: "test invoice",
  returnUrl: "https://alturathkw.shop/",
  cancelUrl: "https://alturathkw.shop/",
  notificationUrl: "https://alturathkw.shop/",
  isAdmin: true
};
fetch("https://order-951671626657.europe-west3.run.app/api/create-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
}).then(r => r.text()).then(console.log).catch(console.error);
