export const isCustomDomain = (): boolean => {
  const host = window.location.hostname;
  // Exclude localhost for dev (unless we specifically want to test domain mapping on localhost, which is hard without modifying /etc/hosts)
  // But usually admin runs on localhost.
  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  // Exclude known admin domains
  // Check env vars first
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
