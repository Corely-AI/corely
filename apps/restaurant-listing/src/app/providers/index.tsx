import React, { useMemo } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeBackoffDelayMs, defaultRetryPolicy } from "@corely/api-client";
import { ToastProvider, useToast } from "@/shared/ui/toast";

const AppQueryProvider = ({ children }: { children: React.ReactNode }) => {
  const { pushToast } = useToast();

  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            const message = error instanceof Error ? error.message : "Request failed";
            pushToast(message, "error");
          },
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount) => failureCount < 2,
            retryDelay: (attempt) => computeBackoffDelayMs(attempt + 1, defaultRetryPolicy),
            staleTime: 30_000,
          },
        },
      }),
    [pushToast]
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <AppQueryProvider>{children}</AppQueryProvider>
  </ToastProvider>
);
