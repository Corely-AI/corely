import { defaultApiBaseUrl } from "@corely/web-shared/lib/api-base-url";
export const openBukBase = /^\/openbuk(?:\/|$)/.test(window.location.pathname) ? "/openbuk" : "";
export const brand = {
  name: "OpenBuk",
  apiUrl: openBukBase ? defaultApiBaseUrl : import.meta.env.VITE_API_URL || "/api",
  appUrl: import.meta.env.VITE_OPENBUK_APP_URL || window.location.origin + openBukBase,
  bookingUrl:
    import.meta.env.VITE_OPENBUK_BOOKING_URL || `${window.location.origin}${openBukBase}/book`,
};
export const bookingLink = (slug: string) =>
  `${brand.bookingUrl.replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
export function normalizeHostRoute() {
  if (openBukBase) {
    return;
  }
  const path = window.location.pathname;
  const appHost = import.meta.env.VITE_OPENBUK_APP_URL;
  const bookHost = import.meta.env.VITE_OPENBUK_BOOKING_URL;
  if (bookHost && new URL(bookHost).host === window.location.host && !path.startsWith("/book/")) {
    window.history.replaceState(
      null,
      "",
      `/book${path}${window.location.search}${window.location.hash}`
    );
  } else if (appHost && new URL(appHost).host === window.location.host && path === "/") {
    window.history.replaceState(null, "", `/app${window.location.search}${window.location.hash}`);
  }
}
