/**
 * Firebase Auth domain resolution.
 *
 * Safari/WKWebView partition storage per top-level site, so the sign-in handler must be
 * same-origin with the app ("missing initial state" error otherwise). Firebase Hosting serves
 * /__/auth/* on every domain attached to the site, so on those hosts we use the serving host.
 * Everything else (localhost, Cloud Run URLs, native shells) keeps the configured authDomain.
 */
const SAME_ORIGIN_HOSTS = new Set<string>([
  'admin.alturathkw.shop',
  'alturath-admin-0200723670.web.app',
  'alturath-admin-0200723670.firebaseapp.com',
]);

export function resolveAuthDomain(
  configured: string,
  hostname: string | undefined,
  envOverride?: string,
): string {
  const override = (envOverride || '').trim();
  if (override) return override;
  const host = (hostname || '').toLowerCase();
  if (host && SAME_ORIGIN_HOSTS.has(host)) return host;
  return configured;
}

const FALLBACK_TO_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export function shouldFallbackToRedirect(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return !!code && FALLBACK_TO_REDIRECT.has(code);
}
