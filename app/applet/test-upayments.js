async function test() {
  const payload = {
    amount: 1.5,
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
  try {
    const res = await fetch('http://localhost:3000/api/create-payment', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch(e) { console.error(e); }
}
test();
