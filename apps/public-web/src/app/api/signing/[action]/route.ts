import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const actions = new Set(["exchange", "review", "progress", "prepare", "accept", "decline"]);
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const origin = request.headers.get("origin");
  if (
    !actions.has(action) ||
    !origin ||
    origin !== process.env.SIGN_PUBLIC_ORIGIN ||
    request.headers.get("x-sign-action") !== "1"
  ) {
    return new Response(null, { status: 403 });
  }
  const base = process.env.PUBLIC_API_BASE_URL;
  if (!base) {
    return new Response(null, { status: 503 });
  }
  const cookie = request.cookies.get("corely_sign_session")?.value;
  const reader = request.body?.getReader();
  if (!reader) {
    return new Response(null, { status: 400 });
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
      return new Response(null, { status: 413 });
    }
    chunks.push(chunk.value);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const result = await fetch(base.replace(/\/$/, "") + "/public/signing/" + action, {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "X-Sign-Action": "1",
      origin,
      ...(cookie && /^[\w-]{43}$/.test(cookie) ? { Cookie: "corely_sign_session=" + cookie } : {}),
    },
    body,
  });
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Type": "application/json",
  });
  const session = result.headers.get("set-cookie");
  if (action === "exchange" && session?.startsWith("corely_sign_session=")) {
    headers.set("Set-Cookie", session);
  }
  return new Response(result.body, { status: result.status, headers });
}
