import { auth } from '../firebase';

// /api/ai/* and /api/smart-studio/* require the signed-in admin/partner's Firebase ID token
// server-side (they call paid models). Every call to them carries that token.
export async function apiAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  return headers;
}
