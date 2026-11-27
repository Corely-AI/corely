import { Buffer } from "node:buffer";

const actions = new Set(["exchange", "review", "progress", "prepare", "accept", "decline"]);
const signerCookie = /(?:^|;\s*)corely_sign_session=([A-Za-z0-9_-]{43})(?:;|$)/;

export async function proxySigningRequest(
  request: Request,
  action: string,
  { publicOrigin, apiBaseUrl }: { publicOrigin?: string; apiBaseUrl?: string }
): Promise<Response> {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  });
  const origin = request.headers.get("origin");
  if (request.method !== "POST") {
    headers.set("Allow", "POST");
    return new Response(null, { status: 405, headers });
  }
  if (
    !actions.has(action) ||
    !origin ||
    origin !== publicOrigin ||
    request.headers.get("x-sign-action") !== "1"
  ) {
    return new Response(null, { status: 403, headers });
  }
  if (!apiBaseUrl) {
    return new Response(null, { status: 503, headers });
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return new Response(null, { status: 400, headers });
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    size += chunk.value.length;
    if (size > 100000) {
      await reader.cancel();
      return new Response(null, { status: 413, headers });
    }
    chunks.push(chunk.value);
  }

  const session = signerCookie.exec(request.headers.get("cookie") ?? "")?.[1];
  const forwarded = {
    method: "POST",
    cache: "no-store" as const,
    redirect: "error" as const,
    headers: {
      "Content-Type": "application/json",
      "X-Sign-Action": "1",
      Origin: origin,
      ...(session && { Cookie: `corely_sign_session=${session}` }),
    },
    body: Buffer.concat(chunks).toString("utf8"),
  };
  let result: Response;
  try {
    result = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/public/signing/${action}`, forwarded);
  } catch {
    return new Response(null, { status: 502, headers });
  }
  headers.set("Content-Type", "application/json");
  if (action === "exchange") {
    const cookie = result.headers
      .getSetCookie()
      .find((value) => value.startsWith("corely_sign_session="));
    if (cookie) {
      headers.set("Set-Cookie", cookie);
    }
  }
  return new Response(result.body, { status: result.status, headers });
}
