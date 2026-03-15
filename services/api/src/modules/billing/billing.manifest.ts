import type { AppManifest } from "@corely/contracts";

export const billingAppManifest: AppManifest = {
  appId: "billing",
  name: "Billing",
  tier: 1,
  version: "1.0.0",
  description: "Subscriptions, checkout, usage, and billing provider synchronization.",
  dependencies: [],
  capabilities: [],
  permissions: ["billing.read", "billing.manage"],
  menu: [],
};
