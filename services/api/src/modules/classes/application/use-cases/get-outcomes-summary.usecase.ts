import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanClasses } from "../../policies/assert-can-classes";

@RequireTenant()
export class GetOutcomesSummaryUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(input: { classGroupId: string }, ctx: UseCaseContext) {
    assertCanClasses(ctx, "classes.read");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const [milestones, completions, enrollments] = await Promise.all([
      this.repo.listMilestonesByClassGroup(tenantId, workspaceId, input.classGroupId),
      this.repo.listMilestoneCompletionsByClassGroup(tenantId, workspaceId, input.classGroupId),
      this.repo.listEnrollments(
        tenantId,
        workspaceId,
        {
          classGroupId: input.classGroupId,
          status: "ENROLLED",
          isActive: true,
        },
        { page: 1, pageSize: 1000 }
      ),
    ]);

    const requiredMilestones = milestones.filter((milestone) => milestone.required);
    const requiredMilestoneIds = new Set(requiredMilestones.map((milestone) => milestone.id));
    const passedCompletions = completions.filter(
      (completion) =>
        requiredMilestoneIds.has(completion.milestoneId) && completion.status === "PASSED"
    );

    const completionDenominator = Math.max(
      1,
      requiredMilestones.length * Math.max(1, enrollments.items.length)
    );

    const dueRequiredMilestones = requiredMilestones.filter(
      (milestone) => milestone.dueAt && milestone.dueAt.getTime() < Date.now()
    );

    const completionsByEnrollment = new Map<string, typeof completions>();
    for (const completion of completions) {
      const bucket = completionsByEnrollment.get(completion.enrollmentId) ?? [];
      bucket.push(completion);
      completionsByEnrollment.set(completion.enrollmentId, bucket);
    }

    let atRiskLearnersCount = 0;
    for (const enrollment of enrollments.items) {
      const learnerCompletions = completionsByEnrollment.get(enrollment.id) ?? [];
      const failedDueRequired = dueRequiredMilestones.some((milestone) => {
        const completion = learnerCompletions.find((item) => item.milestoneId === milestone.id);
        return !completion || completion.status !== "PASSED";
      });
      if (failedDueRequired) {
        atRiskLearnersCount += 1;
      }
    }

    return {
      classGroupId: input.classGroupId,
      totalRequiredMilestones: requiredMilestones.length,
      totalCompletionsPassed: passedCompletions.length,
      atRiskLearnersCount,
      completionRate: passedCompletions.length / completionDenominator,
    };
  }
}
