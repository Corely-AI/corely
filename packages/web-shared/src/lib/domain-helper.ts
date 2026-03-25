import { normalizeSurfaceHostname, resolveSurface } from "@corely/contracts";

export const isCustomDomainHost = (hostname: string): boolean => {
  const host = normalizeSurfaceHostname(hostname);

  if (!host) {
    return false;
  }

  // Keep local surface subdomains in app mode so crm.localhost / pos.localhost
  // route into the authenticated shell instead of public portfolio pages.
  if (host.endsWith(".localhost") && resolveSurface(host) !== "platform") {
    return false;
  }

  // Exclude localhost for dev. Bare localhost should always behave like the app shell.
  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  const appHostsRaw =
    import.meta.env.VITE_APP_HOSTS ?? import.meta.env.VITE_APP_HOST ?? "app.corely.one";
  const appHosts = appHostsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (appHosts.includes(host)) {
    return false;
  }

  const baseDomainsRaw = import.meta.env.VITE_APP_BASE_DOMAINS ?? "corely.one";
  const baseDomains = baseDomainsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (baseDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return false;
  }

  return true;
};

export const isCustomDomain = (): boolean => {
  return isCustomDomainHost(window.location.hostname);
};
