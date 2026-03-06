import { Injectable } from "@nestjs/common";
import type { GetTaxCapabilitiesResponse } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxCapabilitiesService } from "../services/tax-capabilities.service";

@RequireTenant()
@Injectable()
export class GetTaxCapabilitiesUseCase extends BaseUseCase<void, GetTaxCapabilitiesResponse> {
  constructor(private readonly capabilities: TaxCapabilitiesService) {
    super({ logger: null as any });
  }

  protected async handle(
    _: void,
    ctx: UseCaseContext
  ): Promise<Result<GetTaxCapabilitiesResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const capabilities = await this.capabilities.getCapabilities(workspaceId);
    return ok({ capabilities });
  }
}
