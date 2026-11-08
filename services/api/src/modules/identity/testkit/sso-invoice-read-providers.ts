import type { Provider } from "@nestjs/common";
import { GetEffectivePermissionsUseCase } from "../application/use-cases/get-effective-permissions.usecase";
import { TenantEntitlementService } from "../../platform/application/services/tenant-entitlement.service";
import { TenantEntitlement } from "../../platform/domain/entitlement.aggregate";

/** Transfer tests use read-only synthetic business grants. Real grant/enablement
 * denial coverage is in platform/__tests__/focused-api-access.int.test.ts.
 */
export const ssoInvoiceReadProviders = (tenantId: string): Provider[] => [
  {
    provide: GetEffectivePermissionsUseCase,
    useValue: {
      execute: async () => ({
        permissions: { allowAll: false, allowed: ["sales.invoices.read"], denied: [] },
      }),
    },
  },
  {
    provide: TenantEntitlementService,
    useValue: {
      getTenantEntitlement: async () =>
        new TenantEntitlement(tenantId, new Set(["invoices"]), new Set(["invoices.pdf"])),
    },
  },
];
