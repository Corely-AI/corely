import { NotFoundError } from "@corely/domain";
import { RequireTenant, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import { CLASSES_COHORT_TEAM_UPDATED_EVENT } from "../../domain/events/monthly-invoices-generated.event";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortTeamManage } from "../../policies/assert-can-classes";
import type { ClassGroupInstructorEntity } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpsertCohortTeamUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: {
      classGroupId: string;
      members: Array<{ partyId: string; role: ClassGroupInstructorEntity["role"] }>;
    },
    ctx: UseCaseContext
  ): Promise<ClassGroupInstructorEntity[]> {
    assertCanCohortTeamManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const classGroup = await this.repo.findClassGroupById(
      tenantId,
      workspaceId,
      input.classGroupId
    );
    if (!classGroup) {
      throw new NotFoundError("Class group not found", { code: "Classes:ClassGroupNotFound" });
    }

    const now = this.clock.now();
    const members = await this.repo.replaceClassGroupInstructors(
      tenantId,
      workspaceId,
      input.classGroupId,
      input.members.map((member) => ({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        partyId: member.partyId,
        role: member.role,
        createdAt: now,
        updatedAt: now,
      }))
    );

    await this.outbox.enqueue({
      tenantId,
      eventType: CLASSES_COHORT_TEAM_UPDATED_EVENT,
      payload: {
        tenantId,
        workspaceId,
        classGroupId: input.classGroupId,
        memberCount: members.length,
        at: now.toISOString(),
      },
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.cohort.team.updated",
      entityType: "ClassGroup",
      entityId: input.classGroupId,
      metadata: { memberCount: members.length },
    });

    return members;
  }
}
