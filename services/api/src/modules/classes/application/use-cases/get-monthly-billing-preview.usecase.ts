import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { aggregateBillingPreview } from "../../domain/rules/billing.rules";
import { getMonthRangeUtc } from "../helpers/billing-period";

@RequireTenant()
export class GetMonthlyBillingPreviewUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { month: string; classGroupId?: string; clientId?: string },
    ctx: UseCaseContext
  ) {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const { startUtc, endUtc, month } = getMonthRangeUtc(input.month);

    const rows = await this.repo.listBillableAttendanceForMonth(tenantId, workspaceId, {
      monthStart: startUtc,
      monthEnd: endUtc,
      classGroupId: input.classGroupId,
      clientId: input.clientId,
    });

    const items = aggregateBillingPreview(rows);

    return {
      month,
      items,
      generatedAt: this.clock.now(),
    };
  }
}
