export const tenantsQueryKeys = {
  all: () => ["tenants"] as const,
  list: (params: object = {}) => ["tenants", "list", params] as const,
};
