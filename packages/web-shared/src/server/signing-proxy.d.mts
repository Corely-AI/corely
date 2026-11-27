export interface SigningProxyOptions {
  publicOrigin?: string;
  apiBaseUrl?: string;
}

export function proxySigningRequest(
  request: Request,
  action: string,
  options: SigningProxyOptions
): Promise<Response>;
