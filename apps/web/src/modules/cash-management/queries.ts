export const cashKeys = {
  all: ["cash"] as const,
  registers: {
    list: { queryKey: ["cash", "registers", "list"] as const },
    detail: (id: string) => ["cash", "registers", id] as const,
  },
  entries: {
    list: (registerId: string, filters: { from?: string; to?: string }) =>
      ["cash", "entries", "list", registerId, filters] as const,
  },
  dailyCloses: {
    list: (registerId: string, filters: { from?: string; to?: string }) =>
      ["cash", "dailyCloses", "list", registerId, filters] as const,
  },
};
