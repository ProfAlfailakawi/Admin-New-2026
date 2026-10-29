import { describe, it, expect } from 'vitest';

// vitest.config.ts sandboxes every test run: payment.test.ts imports server.ts, which would
// otherwise start the payment-alerts runner and use a developer's gcloud credentials.
describe('test sandbox', () => {
  it('never gives tests the alerts runner or Google credentials', () => {
    expect(process.env.ENABLE_INTERNAL_ALERTS_RUNNER).toBe('false');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/nonexistent/no-credentials-in-tests.json');
  });
});
