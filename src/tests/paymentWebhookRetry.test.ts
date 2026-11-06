import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { runWithDeadlineAndRetry } from '../lib/paymentWebhookRetry';

const fast = { deadlineMs: 20, retryDelayMs: 1 };
const never = () => new Promise(() => {});

describe('payment webhook deadline', () => {
  it('runs once when the update succeeds', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    await expect(runWithDeadlineAndRetry(task, fast)).resolves.toEqual({ ok: true, attempts: 1 });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('recovers when the first attempt hangs (the INV-5142 failure)', async () => {
    const task = vi.fn().mockImplementationOnce(never).mockResolvedValue(undefined);
    const failed = vi.fn();
    const result = await runWithDeadlineAndRetry(task, { ...fast, onAttemptFailed: failed });
    expect(result).toEqual({ ok: true, attempts: 2 });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it('retries after a rejected attempt', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(undefined);
    await expect(runWithDeadlineAndRetry(task, fast)).resolves.toEqual({ ok: true, attempts: 2 });
  });

  it('gives up after the last attempt and reports failure instead of hanging', async () => {
    const task = vi.fn().mockImplementation(never);
    const result = await runWithDeadlineAndRetry(task, { ...fast, attempts: 3 });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toContain('deadline');
    expect(task).toHaveBeenCalledTimes(3);
  });
});

describe('payment webhook routes', () => {
  const server = readFileSync('server.ts', 'utf8');

  it('never lets a route wait on the unbounded handler', () => {
    const start = server.indexOf('app.post("/api/webhook/upayments"');
    const end = server.indexOf('// API logging middleware', start);
    const routes = server.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(routes).not.toContain('await handlePaymentUpdate(');
    expect(routes.match(/respondToPaymentWebhook\(/g)).toHaveLength(4);
  });

  it('answers with a failure, not OK, when the payment was not processed', () => {
    const start = server.indexOf('const respondToPaymentWebhook');
    const helper = server.slice(start, server.indexOf('app.post("/api/webhook/upayments"'));
    expect(helper).toContain('res.status(503)');
    expect(helper).toContain('[PAYMENT_WEBHOOK_UNPROCESSED]');
  });
});
