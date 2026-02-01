import { Injectable } from "@nestjs/common";
import type { CalculateTaxInput, TaxBreakdownDto } from "@corely/contracts";
import { TaxEngineService } from "../services/tax-engine.service";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

/**
 * Calculate Tax Use Case
 * Used by invoice/expense modules for draft preview
 */
@RequireTenant()
@Injectable()
export class CalculateTaxUseCase extends BaseUseCase<CalculateTaxInput, TaxBreakdownDto> {
  constructor(private readonly taxEngine: TaxEngineService) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CalculateTaxInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxBreakdownDto, UseCaseError>> {
    const result = await this.taxEngine.calculate(input, ctx.workspaceId || ctx.tenantId);
    return ok(result);
  }
}
