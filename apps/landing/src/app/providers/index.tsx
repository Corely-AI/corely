import React from "react";

import { PostHogProvider } from "@/shared/lib/posthog";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <PostHogProvider>{children}</PostHogProvider>
);
