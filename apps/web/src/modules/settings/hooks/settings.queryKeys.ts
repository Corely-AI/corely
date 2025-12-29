export const settingsQueryKeys = {
  roles: {
    all: () => ["settings", "roles"] as const,
    list: () => ["settings", "roles", "list"] as const,
    detail: (roleId: string) => ["settings", "roles", roleId] as const,
    permissions: (roleId: string) => ["settings", "roles", roleId, "permissions"] as const,
  },
  permissionCatalog: () => ["settings", "permissions", "catalog"] as const,
};
