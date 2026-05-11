const https = require('https');
const payload = JSON.stringify({
  order: { id: "INV-123456", reference: "INV-123456", description: "test", currency: "KWD", amount: 1.5 },
  language: "en", is_sms: 1, is_email: 1, paymentGateway: { src: "knet" }, reference: { id: "INV-123456" },
  customer: { uniqueId: "96599999999", name: "Test User", email: "no-email@example.com", mobile: "96599999999" },
  returnUrl: "https://alturathkw.shop/api/payment-return/1", 
  cancelUrl: "https://alturathkw.shop/api/payment-return/1",
  notificationUrl: "https://order-951671626657.europe-west3.run.app/api/webhook/upayments"
});
const options = {
  hostname: 'apiv2api.upayments.com', port: 443, path: '/api/v1/charge', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.UPAYMENTS_API_KEY}` }
};
const req = https.request(options, res => {
  let data = ''; res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.on('error', e => console.error(e));
req.write(payload); req.end();
