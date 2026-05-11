import "dotenv/config";
async function test() {
  const apiKey = process.env.UPAYMENTS_API_KEY?.replace(/[^\x20-\x7E]/g, '')?.replace(/\s+/g, '')?.trim();
  const payload = {
    order: {
      id: 'TEST1234',
      reference: 'TEST1234',
      description: 'Test',
      currency: 'KWD',
      amount: 1.000
    },
    language: 'en',
    paymentGateway: { src: 'knet' },
    reference: { id: 'TEST1234' },
    customer: {
      uniqueId: 'test@example.com',
      name: 'Test',
      email: 'test@example.com',
      mobile: '96500000000'
    },
    returnUrl: 'https://example.com',
    cancelUrl: 'https://example.com',
    notificationUrl: 'https://example.com'
  };

  const res = await fetch("https://apiv2api.upayments.com/api/v1/charge", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  const data = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", data);
}
test();
