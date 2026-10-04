export const brand = {
  name: "OpenBuk",
  apiUrl: import.meta.env.VITE_API_URL || "/api",
  appUrl: import.meta.env.VITE_OPENBUK_APP_URL || window.location.origin,
  bookingUrl: import.meta.env.VITE_OPENBUK_BOOKING_URL || `${window.location.origin}/book`,
};
export const bookingLink = (slug: string) =>
  `${brand.bookingUrl.replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
export function normalizeHostRoute() {
  const path = window.location.pathname;
  const appHost = import.meta.env.VITE_OPENBUK_APP_URL;
  const bookHost = import.meta.env.VITE_OPENBUK_BOOKING_URL;
  if (bookHost && new URL(bookHost).host === window.location.host && !path.startsWith("/book/")) {
    window.history.replaceState(null, "", `/book${path}${window.location.search}`);
  } else if (appHost && new URL(appHost).host === window.location.host && path === "/") {
    window.history.replaceState(null, "", "/app");
  }
}
