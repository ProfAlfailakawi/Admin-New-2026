const TRACKING_TOKEN_BYTES = 32;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function issueTrackingAccess(): Promise<{
  token: string;
  tokenHash: string;
}> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error("Secure browser cryptography is unavailable");
  }

  const randomBytes = new Uint8Array(TRACKING_TOKEN_BYTES);
  globalThis.crypto.getRandomValues(randomBytes);
  const token = toBase64Url(randomBytes);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return {
    token,
    tokenHash: toHex(new Uint8Array(digest)),
  };
}

export function buildSecureTrackingUrl(
  orderId: unknown,
  trackingToken?: unknown,
): string {
  const url = new URL("/track", "https://alturathkw.shop");
  url.searchParams.set("tracked_order", String(orderId || "").trim());
  const token = String(trackingToken || "").trim();
  if (token) url.searchParams.set("track_access", token);
  return url.toString();
}
