import React, { useMemo } from "react";
import { PostHogProvider } from "@corely/web-shared/shared/lib/posthog";
import { SonnerToaster, Toaster, TooltipProvider } from "@corely/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeBackoffDelayMs, defaultRetryPolicy } from "@corely/api-client";
import { AuthProvider } from "@corely/web-shared/lib/auth-provider";
import { WorkspaceProvider } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { WorkspaceConfigProvider } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { OfflineProvider } from "@corely/web-shared/offline/offline-provider";
import { useThemeStore } from "@corely/web-shared/shared/theme/themeStore";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => computeBackoffDelayMs(attempt, defaultRetryPolicy),
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <WorkspaceConfigProvider>
            <OfflineProvider queryClient={queryClient}>
              <PostHogProvider>
                <TooltipProvider>
                  {children}
                  <Toaster />
                  <SonnerToaster theme={resolvedTheme} />
                </TooltipProvider>
              </PostHogProvider>
            </OfflineProvider>
          </WorkspaceConfigProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
