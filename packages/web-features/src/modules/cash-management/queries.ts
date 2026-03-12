import type { QueryClient } from "@tanstack/react-query";

export const cashKeys = {
  registers: {
    list: (params: Record<string, unknown> = {}) => ["cash-registers", "list", params] as const,
    detail: (id: string) => ["cash-registers", id] as const,
  },
  entries: {
    list: (params: Record<string, unknown>) => ["cash-entries", "list", params] as const,
    attachments: (entryId: string) => ["cash-entries", entryId, "attachments"] as const,
  },
  dayCloses: {
    list: (params: Record<string, unknown>) => ["cash-day-closes", "list", params] as const,
    detail: (registerId: string, dayKey: string) =>
      ["cash-day-closes", registerId, dayKey] as const,
  },
  exports: {
    list: (params: Record<string, unknown>) => ["cash-exports", "list", params] as const,
  },
};

export const invalidateCashRegisterQueries = async (
  queryClient: QueryClient,
  registerId: string
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: cashKeys.registers.list() }),
    queryClient.invalidateQueries({ queryKey: cashKeys.registers.detail(registerId) }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("cash-");
      },
    }),
  ]);
};
