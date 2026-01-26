import { type PropsWithChildren, useEffect, useRef } from "react";
import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export function PostHogProvider({ children }: PropsWithChildren) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // For landing page (often SPA or static), default pageview capture is usually fine.
      });
      initialized.current = true;
    }
  }, []);

  return <>{children}</>;
}

export { posthog };
