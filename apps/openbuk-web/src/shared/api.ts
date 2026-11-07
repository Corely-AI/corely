import { AuthClient, ApiClient, type TokenStorage } from "@corely/auth-client";
import { brand } from "./brand";
const get = (key: string) => Promise.resolve(localStorage.getItem(`openbuk:${key}`));
const set = (key: string, value: string | null) => {
  if (value) {
    localStorage.setItem(`openbuk:${key}`, value);
  } else {
    localStorage.removeItem(`openbuk:${key}`);
  }
  return Promise.resolve();
};
export const storage: TokenStorage = {
  getAccessToken: () => get("access"),
  setAccessToken: (v) => set("access", v),
  getRefreshToken: () => get("refresh"),
  setRefreshToken: (v) => set("refresh", v),
  getActiveWorkspaceId: () => get("workspace"),
  setActiveWorkspaceId: (v) => set("workspace", v),
  clear: async () => {
    await Promise.all([set("access", null), set("refresh", null), set("workspace", null)]);
  },
};
export const auth = new AuthClient({ apiUrl: brand.apiUrl, storage });
export const api = new ApiClient({
  apiUrl: brand.apiUrl,
  storage,
  authClient: auth,
  onAuthError: () => window.location.assign("/login"),
});
export async function publicApi<T>(slug: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(
    `${brand.apiUrl}/w/${encodeURIComponent(slug)}/public/openbuk/${path}`,
    options
  );
  if (!response.ok) {
    throw new Error(response.status === 409 ? "slotConflict" : "requestFailed");
  }
  return response.json() as Promise<T>;
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
