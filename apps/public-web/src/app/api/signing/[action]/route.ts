import { proxySigningRequest } from "@corely/web-shared/server/signing-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  return proxySigningRequest(request, action, {
    publicOrigin: process.env.SIGN_PUBLIC_ORIGIN,
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL,
  });
}
