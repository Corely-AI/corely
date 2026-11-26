import { BrowserLocaleProvider } from "@corely/web-shared/shared/i18n/browser-locale";
import React from "react";

import { PostHogProvider } from "@/shared/lib/posthog";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <BrowserLocaleProvider storageKey="corely:landing:locale">
    <PostHogProvider>{children}</PostHogProvider>
  </BrowserLocaleProvider>
);
