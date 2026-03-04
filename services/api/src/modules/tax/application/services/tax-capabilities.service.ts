import { Injectable } from "@nestjs/common";
import type { TaxCapabilities } from "@corely/contracts";
import { TaxStrategyResolverService } from "./tax-strategy-resolver.service";

/**
 * TaxCapabilitiesService — Layered capability gating
 *
 * Layer 1: Global env kill-switch (TAX_PAYMENTS_ENABLED)
 * Layer 2: Per-strategy capabilities (PERSONAL vs COMPANY × jurisdiction)
 *
 * Future Layer 3: Per-workspace persisted flag (WorkspaceTaxSettingsPort)
 */
@Injectable()
export class TaxCapabilitiesService {
  constructor(private readonly strategyResolver: TaxStrategyResolverService) {}

  async getCapabilities(workspaceId: string): Promise<TaxCapabilities & { strategy?: object }> {
    // Layer 1: Global kill-switch
    const flag = process.env.TAX_PAYMENTS_ENABLED;
    const paymentsEnabled =
      flag === undefined ? true : flag === "true" || flag === "1" || flag === "yes";

    // Layer 2: Strategy capabilities (async resolve)
    const strategy = await this.strategyResolver.resolve(workspaceId);
    const strategyCapabilities = strategy.capabilities ?? {
      canFileVat: paymentsEnabled,
      canPayVat: paymentsEnabled,
      needsConsultant: false,
      supportsReverseCharge: false,
      supportsOss: false,
      supportsEur: false,
    };

    return {
      paymentsEnabled,
      strategy: {
        ...strategyCapabilities,
        // Global kill-switch overrides canPayVat if disabled
        canPayVat: paymentsEnabled && (strategyCapabilities.canPayVat ?? true),
      },
    };
  }
}
