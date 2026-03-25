import { normalizeSurfaceHostname, resolveSurface } from "@corely/contracts";

type ResolveApiBaseUrlInput = {
  apiBaseUrl?: string | null;
  apiUrl?: string | null;
  isDev: boolean;
  browserHostname?: string | null;
};

const isLocalApiUrl = (value: string): boolean => {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = normalizeSurfaceHostname(url.hostname);

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
};

const isLocalSurfaceHost = (hostname: string | null | undefined): boolean => {
  const normalized = normalizeSurfaceHostname(hostname);
  return normalized.endsWith(".localhost") && resolveSurface(normalized) !== "platform";
};

export const resolveApiBaseUrl = (input: ResolveApiBaseUrlInput): string => {
  const explicitBaseUrl = input.apiBaseUrl?.trim();
  const explicitApiUrl = input.apiUrl?.trim();
  const explicitUrl = explicitBaseUrl || explicitApiUrl;

  if (input.isDev && isLocalSurfaceHost(input.browserHostname)) {
    if (!explicitUrl || !isLocalApiUrl(explicitUrl)) {
      return "/api";
    }
  }

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  return input.isDev ? "/api" : "http://localhost:3000";
};

export const defaultApiBaseUrl = resolveApiBaseUrl({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  apiUrl: import.meta.env.VITE_API_URL,
  isDev: import.meta.env.DEV,
  browserHostname: typeof window === "undefined" ? undefined : window.location.hostname,
});
