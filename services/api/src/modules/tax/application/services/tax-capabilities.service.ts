import { Injectable } from "@nestjs/common";
import type { TaxCapabilities } from "@corely/contracts";

@Injectable()
export class TaxCapabilitiesService {
  async getCapabilities(): Promise<TaxCapabilities> {
    const flag = process.env.TAX_PAYMENTS_ENABLED;
    const paymentsEnabled =
      flag === undefined ? true : flag === "true" || flag === "1" || flag === "yes";
    return {
      paymentsEnabled,
    };
  }
}
