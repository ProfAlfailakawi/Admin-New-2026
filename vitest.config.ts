import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Some tests import server.ts, which starts the payment-alerts runner and connects to
    // Firestore at import time. On a machine with gcloud credentials that would reach the
    // live project and could send real alerts, so tests never get either.
    env: {
      ENABLE_INTERNAL_ALERTS_RUNNER: 'false',
      GOOGLE_APPLICATION_CREDENTIALS: '/nonexistent/no-credentials-in-tests.json',
    },
  },
});
