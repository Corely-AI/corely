const edition = import.meta.env.VITE_EDITION === "ee" ? "ee" : "oss";

export const features = {
  edition,
  multiTenant: edition === "ee",
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID ?? "default_tenant",
  defaultWorkspaceId: import.meta.env.VITE_DEFAULT_WORKSPACE_ID ?? "default_workspace",
};
