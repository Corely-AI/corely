import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortBillingManage } from "../../policies/assert-can-classes";
import type { ClassEnrollmentBillingPlanEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class GetEnrollmentBillingPlanUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(
    input: { enrollmentId: string },
    ctx: UseCaseContext
  ): Promise<ClassEnrollmentBillingPlanEntity | null> {
    assertCanCohortBillingManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    return this.repo.findEnrollmentBillingPlan(tenantId, workspaceId, input.enrollmentId);
  }
}
