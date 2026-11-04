import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const source = readFileSync('server.ts', 'utf8');

function extractFunction(name: string, start: string, end: string, env: Record<string, string> = {}) {
  const config = source.slice(source.indexOf('const KAPSO_WEBHOOK_SECRET'), source.indexOf('const WHATSAPP_BOT_ENABLED'));
  const block = `${source.slice(source.indexOf('function waString'), source.indexOf('function waDigits'))}\n${config}\n${source.slice(source.indexOf(start), source.indexOf(end))}`;
  const compiled = ts.transpile(`${block}\nreturn ${name};`, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
  return new Function('process', 'crypto', 'Buffer', compiled)({ env }, awaitlessCrypto, Buffer) as (...args: any[]) => any;
}

const awaitlessCrypto = { createHmac, timingSafeEqual };

describe('WhatsApp webhook signatures', () => {
  const meta = (env: Record<string, string>) => extractFunction('waWebhookSignatureValid', 'const WHATSAPP_APP_SECRET', 'function waKapsoWebhookSignatureValid', env);
  const kapso = (env: Record<string, string>) => extractFunction('waKapsoWebhookSignatureValid', 'function waKapsoWebhookSignatureValid', '// Anything whose meaning lives outside the text', env);

  it('fails closed when the Meta secret, raw body, or signature is missing', () => {
    const check = meta({});
    expect(check({ rawBody: Buffer.from('{}'), headers: { 'x-hub-signature-256': 'sha256=deadbeef' } })).toBe(false);
    const withSecret = meta({ WHATSAPP_APP_SECRET: 'test-secret' });
    expect(withSecret({ rawBody: Buffer.from('{}'), headers: {} })).toBe(false);
    expect(withSecret({ rawBody: '{}', headers: { 'x-hub-signature-256': 'sha256=deadbeef' } })).toBe(false);
  });

  it('accepts a valid Meta HMAC over the original bytes and rejects a tampered body', () => {
    const raw = Buffer.from('{ "entry": [] }');
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(raw).digest('hex')}`;
    const check = meta({ WHATSAPP_APP_SECRET: 'test-secret' });
    expect(check({ rawBody: raw, headers: { 'x-hub-signature-256': signature } })).toBe(true);
    expect(check({ rawBody: Buffer.from('{"entry":[]}'), headers: { 'x-hub-signature-256': signature } })).toBe(false);
  });

  it('uses Kapso signature header and secret independently from Meta', () => {
    const raw = Buffer.from('{"messages":[]}');
    const signature = createHmac('sha256', 'kapso-secret').update(raw).digest('hex');
    const check = kapso({ KAPSO_WEBHOOK_SECRET: 'kapso-secret' });
    expect(check({ rawBody: raw, headers: { 'x-webhook-signature': signature } })).toBe(true);
    expect(check({ rawBody: raw, headers: { 'x-hub-signature-256': `sha256=${signature}` } })).toBe(false);
    expect(kapso({})({ rawBody: raw, headers: { 'x-webhook-signature': signature } })).toBe(false);
  });

  it('builds stable provider-scoped keys for deduplicating repeated deliveries', () => {
    const key = extractFunction('waKapsoMessageIdempotencyKey', 'function waStableIdempotencyKey', 'async function waClaimInboundMessage');
    expect(key('wamid.123')).toBe('kapso:wamid.123');
    expect(key('', 'event-456')).toBe('kapso:event-456');
    expect(key('', '')).toBe('');
  });

  it('normalizes Kapso v2 message and buffered batch payloads without replying to passive/outbound events', () => {
    const stringHelpers = source.slice(source.indexOf('function waString'), source.indexOf('function waDigits'));
    const digitHelpers = source.slice(source.indexOf('function waDigits'), source.indexOf('function waMaskPhone'));
    const arrays = source.slice(source.indexOf('function waAsArray'), source.indexOf('function waUnique'));
    const textExtractor = source.slice(source.indexOf('function waExtractMessageText'), source.indexOf('// Meta signs every webhook POST'));
    const normalizer = source.slice(source.indexOf('function waKapsoWebhookPayloads'), source.indexOf('async function waClaimInboundMessage'));
    const compiled = ts.transpile(`${stringHelpers}\n${digitHelpers}\n${arrays}\n${textExtractor}\n${normalizer}\nreturn { waKapsoWebhookPayloads, waNormalizeKapsoInbound };`, { target: ts.ScriptTarget.ES2022 });
    const { waKapsoWebhookPayloads, waNormalizeKapsoInbound } = new Function(compiled)();
    const sample = { message: { id: 'wamid.1', type: 'text', from: '96550001234', from_user_id: 'KW.scoped', text: { body: 'السلام عليكم' }, kapso: { direction: 'inbound' } }, conversation: { phone_number: '96550001234', business_scoped_user_id: 'KW.scoped', contact_name: 'عميل' } };
    expect(waKapsoWebhookPayloads({ batch: true, data: [sample] })).toEqual([sample]);
    const normalized = waNormalizeKapsoInbound(sample, 'whatsapp.message.received');
    expect(normalized).toMatchObject({ from: '96550001234', bsuid: 'KW.scoped', text: 'السلام عليكم', messageId: 'wamid.1', contactName: 'عميل', incoming: true });
    expect(waNormalizeKapsoInbound({ ...sample, message: { ...sample.message, kapso: { passive: true } } }, 'whatsapp.message.received').incoming).toBe(false);
    expect(waNormalizeKapsoInbound(sample, 'whatsapp.message.sent').incoming).toBe(false);
  });
});

describe('WhatsApp privacy and normalized event handling', () => {
  function util(name: string, start: string, end: string) {
    const helpers = source.slice(source.indexOf('function waString'), source.indexOf('function waDigits'));
    const digits = source.slice(source.indexOf('function waDigits'), source.indexOf('function waMaskPhone'));
    const customerPhone = source.slice(source.indexOf('function waCustomerPhone'), source.indexOf('function waNormalizeKuwaitPhone8'));
    const phoneNormalize = source.slice(source.indexOf('function waNormalizeKuwaitPhone8'), source.indexOf('function waExtractKuwaitPhone8'));
    const block = `${helpers}\n${digits}\n${customerPhone}\n${phoneNormalize}\n${source.slice(source.indexOf(start), source.indexOf(end))}`;
    const compiled = ts.transpile(`${block}\nreturn ${name};`, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
    return new Function('process', compiled)({ env: {} }) as (...args: any[]) => any;
  }

  it('does not treat an order identifier as proof of ownership', () => {
    const digits = util('waDigits', 'function waDigits', 'function waMaskPhone');
    const phone8 = util('waNormalizeKuwaitPhone8', 'function waNormalizeKuwaitPhone8', 'function waExtractKuwaitPhone8');
    const customerPhone = util('waCustomerPhone', 'function waCustomerPhone', 'function waNormalizeKuwaitPhone8');
    const belongs = util('waLookupBelongsToSender', 'function waLookupBelongsToSender', 'async function waFindLatestByPhone');
    expect(belongs({ data: { customerPhone: digits('50001234') } }, digits('50001234'))).toBe(true);
    expect(belongs({ data: { customerPhone: digits('50001234') } }, digits('55556666'))).toBe(false);
    expect(belongs({ data: {} }, digits('50001234'))).toBe(false);
    expect(phone8('+965 50001234')).toBe('50001234');
    expect(customerPhone({ customer: { phone: '+965 50001234' } })).toBe('96550001234');
  });

  it('extracts the documented text, button, and interactive message forms', () => {
    const extract = util('waExtractMessageText', 'function waExtractMessageText', '// Meta signs every webhook POST');
    expect(extract({ type: 'text', text: { body: 'السلام عليكم' } })).toBe('السلام عليكم');
    expect(extract({ type: 'button', button: { text: 'منيو' } })).toBe('منيو');
    expect(extract({ type: 'interactive', interactive: { list_reply: { title: 'مجبوس دجاج' } } })).toBe('مجبوس دجاج');
    expect(extract({ type: 'image', image: { id: 'media-id' } })).toBe('');
  });
});
