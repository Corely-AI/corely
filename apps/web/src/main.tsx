// All hostnames serve the same build. Existing SSO origins retain their cookie boundary.
const { origin, pathname } = window.location;
const isOrigin = (url: string | undefined) => !!url && origin === new URL(url).origin;
const isOpenBukHost = [
  import.meta.env.VITE_OPENBUK_APP_URL,
  import.meta.env.VITE_OPENBUK_BOOKING_URL,
  import.meta.env.VITE_OPENBUK_MARKETING_URL,
].some((url) => isOrigin(url) && new URL(url).pathname === "/");

const studio = /^\/openbuk\/app(?:\/|$)/.test(pathname);
if ((/^\/openbuk(?:\/|$)/.test(pathname) && !studio) || isOpenBukHost) {
  void import("./modules/openbuk/main");
} else if (
  pathname === "/login" ||
  isOrigin(import.meta.env.VITE_CORELY_LOGIN_ORIGIN ?? "https://login.corely.one")
) {
  void import("./modules/sso-login/main");
} else if (isOrigin(import.meta.env.VITE_CORELY_HR_ORIGIN ?? "https://hr.app.corely.one")) {
  void import("./modules/sso-hr/main");
} else if (
  isOrigin(import.meta.env.VITE_CORELY_INVOICE_ORIGIN ?? "https://invoice.app.corely.one")
) {
  void import("./modules/sso-invoice/main");
} else if (isOrigin(import.meta.env.VITE_CORELY_APP_CENTER_ORIGIN ?? "https://app.corely.one")) {
  void import("./modules/app-center/main");
} else {
  void import("./backoffice");
}
