import type { DealLossRegistration } from "@corely/crm/extensions";

// Deals are tenant-owned. Register policies at the record's tenant scope.
export const dealLossPolicies: readonly DealLossRegistration[] = [];
