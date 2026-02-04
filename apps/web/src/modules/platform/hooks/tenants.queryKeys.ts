export const tenantsQueryKeys = {
  all: () => ["tenants"] as const,
  list: (params: Record<string, unknown> = {}) => ["tenants", "list", params] as const,
};
