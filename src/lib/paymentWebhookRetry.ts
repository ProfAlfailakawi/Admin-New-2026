/**
 * Gives a payment webhook a bounded amount of time.
 *
 * On 2026-11-05 a CAPTURED webhook for INV-5142 hung on its first Firestore read for
 * the full 900s Cloud Run timeout. Nothing was saved, the gateway did not resend it,
 * and the invoice stayed "pending" although the money had arrived. Each attempt now
 * has a deadline and is retried, so one stuck call cannot lose a payment silently.
 *
 * An attempt that passes its deadline cannot be cancelled and may still finish. That
 * is safe here: the payment sync only writes "paid" and its alert is claimed once.
 */

export type PaymentRetryOptions = {
  attempts?: number;
  deadlineMs?: number;
  retryDelayMs?: number;
  onAttemptFailed?: (attempt: number, error: string) => void;
};

export type PaymentRetryResult = { ok: boolean; attempts: number; error?: string };

export const PAYMENT_WEBHOOK_RETRY = { attempts: 3, deadlineMs: 25_000, retryDelayMs: 1_000 };

export async function runWithDeadlineAndRetry(
  task: () => Promise<unknown>,
  options: PaymentRetryOptions = {},
): Promise<PaymentRetryResult> {
  const { attempts, deadlineMs, retryDelayMs } = { ...PAYMENT_WEBHOOK_RETRY, ...options };
  let lastError = '';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        task(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`deadline of ${deadlineMs}ms exceeded`)), deadlineMs);
        }),
      ]);
      return { ok: true, attempts: attempt };
    } catch (error: any) {
      lastError = error?.message || String(error);
      options.onAttemptFailed?.(attempt, lastError);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  return { ok: false, attempts, error: lastError };
}
