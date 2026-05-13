fetch('http://localhost:3000/api/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1,
    customerName: 'Test',
    customerEmail: 'test@example.com',
    customerMobile: '96500000000',
    orderId: 'TEST1234',
    description: 'Test',
    returnUrl: 'https://example.com',
    cancelUrl: 'https://example.com',
    notificationUrl: 'https://example.com'
  })
}).then(r=>r.text()).then(console.log)
