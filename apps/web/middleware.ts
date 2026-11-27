import { CORELY_APP_ORIGIN } from "./src/app/corely-app-origin";

export const config = {
  runtime: "nodejs",
  matcher: [
    "/sso/cli/:path*",
    "/sso/authorize",
    "/sso/context",
    "/sso/login",
    "/sso/email-code/request",
    "/sso/email-code/verify",
    "/sso/cancel",
  ],
};

const requestHeaders = ["accept", "authorization", "content-type", "cookie", "origin"];
const responseHeaders = [
  "content-security-policy",
  "content-type",
  "location",
  "pragma",
  "x-content-type-options",
  "x-frame-options",
];

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (
    url.origin !== CORELY_APP_ORIGIN ||
    !(url.pathname.startsWith("/sso/cli/") || config.matcher.includes(url.pathname))
  ) {
    return;
  }

  const headers = new Headers({ "cache-control": "no-store", "referrer-policy": "no-referrer" });
  const proxyKey = process.env.CORELY_SSO_PROXY_KEY;
  if (!proxyKey || proxyKey.length < 32) {
    return new Response(null, { status: 503, headers });
  }

  const forwarded = new Headers({
    "x-corely-sso-origin": CORELY_APP_ORIGIN,
    "x-corely-sso-proxy-key": proxyKey,
  });
  for (const name of requestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) {
      forwarded.set(name, value);
    }
  }

  const target = new URL("https://api.corely.one");
  target.pathname = url.pathname;
  target.search = url.search;
  const options = {
    method: request.method,
    headers: forwarded,
    body: request.body,
    duplex: "half" as const,
    redirect: "manual" as const,
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
  };
  try {
    const upstream = await fetch(target, options);
    for (const name of responseHeaders) {
      const value = upstream.headers.get(name);
      if (value !== null) {
        headers.set(name, value);
      }
    }
    for (const cookie of upstream.headers.getSetCookie()) {
      headers.append("set-cookie", cookie);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response(null, { status: 502, headers });
  }
}
