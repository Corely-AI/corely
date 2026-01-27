import { type PropsWithChildren, useEffect, useRef } from "react";
import posthog from "posthog-js";

// Initialize PostHog globally to ensure it's available
// We check for window to support SSR safe environments if needed (though this is SPA)
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export function PostHogProvider({ children }: PropsWithChildren) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false, // We will handle pageviews manually if needed, or set to true.
        // For SPA it is often better to leave it true as PostHog handles history automatically.
        // Let's stick to defaults but be explicit if strictly needed.
        // default 'capture_pageview' is true, which works with History API.
      });
      initialized.current = true;
    }
  }, []);

  return <>{children}</>;
}

export { posthog };
