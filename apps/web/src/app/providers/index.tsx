import React, { useMemo } from "react";
import { PostHogProvider } from "@/shared/lib/posthog";
import { SonnerToaster, Toaster, TooltipProvider } from "@corely/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeBackoffDelayMs, defaultRetryPolicy } from "@corely/api-client";
import { AuthProvider } from "@/lib/auth-provider";
import { WorkspaceProvider } from "@/shared/workspaces/workspace-provider";
import { WorkspaceConfigProvider } from "@/shared/workspaces/workspace-config-provider";
import { OfflineProvider } from "@/offline/offline-provider";
import { useThemeStore } from "@/shared/theme/themeStore";

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
