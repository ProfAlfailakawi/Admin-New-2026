import 'dotenv/config';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth } = pkg;

const VERSION = '1.0.0';
const baseUrl = String(process.env.ALTURATH_BRIDGE_BASE_URL || '').trim().replace(/\/$/, '');
const secret = String(process.env.WHATSAPP_BRIDGE_SECRET || '').trim();
const deviceId = String(process.env.WHATSAPP_BRIDGE_DEVICE_ID || 'alturath-mac-main').trim();
const sessionPath = path.resolve(process.cwd(), String(process.env.WHATSAPP_SESSION_PATH || '.session'));
const sentJournalPath = path.join(sessionPath, 'alturath-sent-outbox.json');
const pollIntervalMs = clampNumber(process.env.WHATSAPP_POLL_INTERVAL_MS, 500, 10000, 1200);
const startupHistoryGraceMs = clampNumber(process.env.WHATSAPP_STARTUP_HISTORY_GRACE_SECONDS, 0, 1800, 120) * 1000;
const markRead = parseBoolean(process.env.WHATSAPP_MARK_READ, true);
const ignoreGroups = parseBoolean(process.env.WHATSAPP_IGNORE_GROUPS, true);
const ignoreStatus = parseBoolean(process.env.WHATSAPP_IGNORE_STATUS, true);

if (!baseUrl || !secret || secret.length < 24) {
  console.error('❌ ملف .env غير مكتمل. يلزم رابط السيرفر وسر بطول 24 حرفاً على الأقل.');
  process.exit(1);
}

let ready = false;
let shuttingDown = false;
let pollTimer = null;
let heartbeatTimer = null;
let accountDigits = '';
let startedAt = Date.now();
let polling = false;
const recentInboundIds = new Map();
const sentOutboxJournal = loadSentJournal();

function loadSentJournal() {
  try {
    const parsed = JSON.parse(fs.readFileSync(sentJournalPath, 'utf8'));
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return new Map(entries.filter((entry) => entry?.id).map((entry) => [String(entry.id), entry]));
  } catch {
    return new Map();
  }
}

function saveSentJournal() {
  try {
    fs.mkdirSync(sessionPath, { recursive: true });
    const entries = Array.from(sentOutboxJournal.values())
      .sort((a, b) => Number(b.sentAt || 0) - Number(a.sentAt || 0))
      .slice(0, 3000);
    fs.writeFileSync(sentJournalPath, JSON.stringify({ version: 1, entries }, null, 2), { mode: 0o600 });
    sentOutboxJournal.clear();
    for (const entry of entries) sentOutboxJournal.set(String(entry.id), entry);
  } catch (error) {
    console.warn('⚠️ تعذر حفظ سجل منع تكرار الإرسال:', error?.message || error);
  }
}

function rememberSentOutbox(id, waMessageId = '') {
  sentOutboxJournal.set(String(id), { id: String(id), waMessageId: String(waMessageId || ''), sentAt: Date.now() });
  saveSentJournal();
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function parseBoolean(value, fallback) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function phoneFromChatId(chatId) {
  const raw = String(chatId || '');
  if (!raw.endsWith('@c.us')) return '';
  return digits(raw.split('@')[0]);
}

function rememberInbound(id) {
  if (!id) return false;
  if (recentInboundIds.has(id)) return true;
  recentInboundIds.set(id, Date.now());
  if (recentInboundIds.size > 3000) {
    const threshold = Date.now() - 6 * 60 * 60 * 1000;
    for (const [key, seenAt] of recentInboundIds) {
      if (seenAt < threshold || recentInboundIds.size > 2500) recentInboundIds.delete(key);
    }
  }
  return false;
}

async function bridgeFetch(route, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        'x-whatsapp-bridge-secret': secret,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendHeartbeat(state = 'online') {
  try {
    await bridgeFetch('/api/whatsapp/bridge/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId, state, account: accountDigits, clientVersion: VERSION }),
      timeoutMs: 12000,
    });
  } catch (error) {
    if (!shuttingDown) console.warn('⚠️ تعذر إرسال نبضة الاتصال:', error?.message || error);
  }
}

async function postInbound(message) {
  const response = await bridgeFetch('/api/whatsapp/bridge/inbound', {
    method: 'POST',
    body: JSON.stringify(message),
    timeoutMs: 30000,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Inbound ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  return payload;
}

async function getNextOutbound() {
  const response = await bridgeFetch('/api/whatsapp/bridge/outbox/next', {
    method: 'GET',
    timeoutMs: 15000,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Outbox ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  return payload.message || null;
}

async function ackOutbound(id, result) {
  const response = await bridgeFetch(`/api/whatsapp/bridge/outbox/${encodeURIComponent(id)}/ack`, {
    method: 'POST',
    body: JSON.stringify(result),
    timeoutMs: 15000,
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Ack ${response.status}: ${payload.slice(0, 500)}`);
  }
}

async function deliverOutbound(item) {
  const to = digits(item?.to);
  const body = String(item?.body || '').trim();
  if (!item?.id || !to || !body) {
    if (item?.id) await ackOutbound(item.id, { ok: false, error: 'invalid_outbox_payload' });
    return;
  }

  const journalEntry = sentOutboxJournal.get(String(item.id));
  if (journalEntry) {
    await ackOutbound(item.id, { ok: true, waMessageId: journalEntry.waMessageId || '' });
    console.log(`✅ تم تثبيت رسالة ${item.id} المرسلة سابقاً من دون تكرارها.`);
    return;
  }

  const chatId = `${to}@c.us`;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const registered = await client.isRegisteredUser(chatId);
      if (!registered) throw new Error(`الرقم ${to} غير مسجل في واتساب`);
      const sent = await client.sendMessage(chatId, body, { linkPreview: true });
      const waMessageId = sent?.id?._serialized || sent?.id?.id || '';
      rememberSentOutbox(item.id, waMessageId);
      await ackOutbound(item.id, {
        ok: true,
        waMessageId,
      });
      console.log(`✅ تم إرسال الرد إلى ${to}`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ فشل الإرسال إلى ${to} — المحاولة ${attempt}/3:`, error?.message || error);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }

  await ackOutbound(item.id, {
    ok: false,
    retry: Number(item?.attempts || 0) < 4,
    error: String(lastError?.message || lastError || 'send_failed').slice(0, 900),
  });
}

async function pollOutbox() {
  if (!ready || polling || shuttingDown) return;
  polling = true;
  try {
    for (let i = 0; i < 10 && ready && !shuttingDown; i += 1) {
      const item = await getNextOutbound();
      if (!item) break;
      await deliverOutbound(item);
    }
  } catch (error) {
    console.warn('⚠️ تعذر قراءة طابور الردود:', error?.message || error);
  } finally {
    polling = false;
  }
}

function startWorkers() {
  clearInterval(pollTimer);
  clearInterval(heartbeatTimer);
  pollTimer = setInterval(() => void pollOutbox(), pollIntervalMs);
  heartbeatTimer = setInterval(() => void sendHeartbeat('online'), 30000);
  void pollOutbox();
  void sendHeartbeat('online');
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: deviceId,
    dataPath: sessionPath,
  }),
  takeoverOnConflict: false,
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', (qr) => {
  console.log('\nامسح رمز QR من واتساب > الإعدادات > الأجهزة المرتبطة > ربط جهاز\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('🔐 تم توثيق جلسة واتساب وحفظها محلياً.');
});

client.on('auth_failure', (message) => {
  console.error('❌ فشل توثيق واتساب:', message);
});

client.on('ready', async () => {
  ready = true;
  startedAt = Date.now();
  accountDigits = digits(client?.info?.wid?._serialized || client?.info?.wid?.user || '');
  console.log(`\n✅ بوت التراث جاهز. الرقم المرتبط: ${accountDigits || 'تم الربط'}\n`);
  startWorkers();
});

client.on('message', async (message) => {
  try {
    if (!ready || shuttingDown || message.fromMe) return;
    if (ignoreStatus && (message.isStatus || message.from === 'status@broadcast')) return;
    if (ignoreGroups && String(message.from || '').endsWith('@g.us')) return;

    const from = phoneFromChatId(message.from);
    if (!from || from === accountDigits) return;

    const messageId = String(message?.id?._serialized || message?.id?.id || '').trim();
    if (rememberInbound(messageId)) return;

    const messageTimeMs = Number(message.timestamp || 0) * 1000;
    if (messageTimeMs && messageTimeMs < startedAt - startupHistoryGraceMs) return;

    const text = String(message.body || '').trim();
    const contact = await message.getContact().catch(() => null);
    const contactName = String(contact?.pushname || contact?.name || contact?.shortName || '').trim();

    console.log(`📩 رسالة من ${from}: ${text || `[${message.type || 'unknown'}]`}`);
    if (markRead) await message.getChat().then((chat) => chat.sendSeen()).catch(() => {});

    await postInbound({
      from,
      text,
      type: String(message.type || 'unknown'),
      contactName,
      messageId,
      raw: {
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        hasMedia: Boolean(message.hasMedia),
      },
    });
  } catch (error) {
    console.error('❌ تعذر تمرير الرسالة إلى برنامج التراث:', error?.message || error);
  }
});

client.on('disconnected', async (reason) => {
  ready = false;
  clearInterval(pollTimer);
  clearInterval(heartbeatTimer);
  console.error('⚠️ انقطع اتصال واتساب:', reason);
  await sendHeartbeat('disconnected');
  if (!shuttingDown) {
    console.error('سيُعاد تشغيل الجسر تلقائياً خلال 5 ثوانٍ.');
    setTimeout(() => process.exit(75), 5000);
  }
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  clearInterval(pollTimer);
  clearInterval(heartbeatTimer);
  console.log(`\nإيقاف آمن (${signal})...`);
  await sendHeartbeat('offline');
  await client.destroy().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('خطأ غير متوقع:', error);
  process.exitCode = 1;
});
process.on('unhandledRejection', (error) => {
  console.error('Promise غير معالج:', error);
});

console.log('تشغيل جسر واتساب التراث المعزول...');
console.log(`السيرفر: ${baseUrl}`);
console.log(`مجلد الجلسة: ${sessionPath}`);
await client.initialize();
