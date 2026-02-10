import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";
import type { ClassMonthlyBillingRunEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class LockMonthUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { billingRunId: string },
    ctx: UseCaseContext
  ): Promise<ClassMonthlyBillingRunEntity> {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const run = await this.repo.findBillingRunById(tenantId, workspaceId, input.billingRunId);
    if (!run) {
      throw new NotFoundError("Billing run not found", { code: "Classes:BillingRunNotFound" });
    }

    const locked = await this.repo.updateBillingRun(tenantId, workspaceId, run.id, {
      status: "LOCKED",
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.billing.month.locked",
      entityType: "ClassMonthlyBillingRun",
      entityId: run.id,
      metadata: { month: run.month },
    });

    return locked;
  }
}
