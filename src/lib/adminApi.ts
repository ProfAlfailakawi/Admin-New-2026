import { auth } from "../firebase";

export async function adminApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Admin authentication is not ready");

  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || "same-origin",
  });
}
