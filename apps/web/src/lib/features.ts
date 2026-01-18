const edition = import.meta.env.VITE_EDITION === "ee" ? "ee" : "oss";

export const features = {
  edition,
  multiTenant: edition === "ee",
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID ?? "tenant_default",
};
