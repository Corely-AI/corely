export const isCustomDomain = (): boolean => {
  const host = window.location.hostname;
  // Exclude localhost for dev (unless we specifically want to test domain mapping on localhost, which is hard without modifying /etc/hosts)
  // But usually admin runs on localhost.
  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  // Exclude known admin domains
  // Check env vars first
  const appHost = import.meta.env.VITE_APP_HOST || "app.corely.com";
  if (host === appHost) {
    return false;
  }
  if (host.endsWith(".corely.com")) {
    return false;
  } // assuming corely.com is the main domain

  return true;
};
