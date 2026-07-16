import 'dotenv/config';

const baseUrl = String(process.env.ALTURATH_BRIDGE_BASE_URL || '').replace(/\/$/, '');
const secret = String(process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

if (!baseUrl || !secret) {
  console.error('❌ عدّل ملف .env أولاً: ALTURATH_BRIDGE_BASE_URL و WHATSAPP_BRIDGE_SECRET');
  process.exit(1);
}

try {
  const publicHealth = await fetch(`${baseUrl}/api/whatsapp/health`, { signal: AbortSignal.timeout(15000) });
  const health = await publicHealth.json().catch(() => ({}));
  console.log('حالة السيرفر:', health);

  const bridgeHealth = await fetch(`${baseUrl}/api/whatsapp/bridge/heartbeat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-whatsapp-bridge-secret': secret,
    },
    body: JSON.stringify({
      deviceId: process.env.WHATSAPP_BRIDGE_DEVICE_ID || 'alturath-mac-main',
      state: 'connection-test',
      clientVersion: 'check-1.0.0',
    }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await bridgeHealth.json().catch(() => ({}));
  if (!bridgeHealth.ok) throw new Error(`${bridgeHealth.status}: ${JSON.stringify(payload)}`);
  console.log('✅ الربط الآمن بين الماك والسيرفر جاهز.', payload);
} catch (error) {
  console.error('❌ فشل اختبار الربط:', error?.message || error);
  process.exit(1);
}
