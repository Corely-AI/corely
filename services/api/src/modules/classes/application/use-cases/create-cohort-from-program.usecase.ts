import { NotFoundError, ValidationFailedError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { CreateCohortFromProgramInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import type { IdempotencyStoragePort } from "../ports/idempotency.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortManage } from "../../policies/assert-can-classes";
import type {
  ClassMilestoneEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";

@RequireTenant()
export class CreateCohortFromProgramUseCase {
  private readonly actionKey = "classes.program.create-cohort";

  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: CreateCohortFromProgramInput & { programId: string },
    ctx: UseCaseContext
  ): Promise<{ classGroupId: string; createdSessionCount: number; createdMilestoneCount: number }> {
    assertCanCohortManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const program = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!program) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    if (input.idempotencyKey) {
      const cached = await this.idempotency.get(this.actionKey, tenantId, input.idempotencyKey);
      if (cached?.body) {
        return cached.body as {
          classGroupId: string;
          createdSessionCount: number;
          createdMilestoneCount: number;
        };
      }
    }

    if (input.generateSessionsFromTemplates && !input.sessionStartAt) {
      throw new ValidationFailedError("sessionStartAt is required when generating sessions", [
        {
          message: "Provide sessionStartAt when generateSessionsFromTemplates=true",
          members: ["sessionStartAt"],
        },
      ]);
    }

    const now = this.clock.now();
    const classGroup = await this.repo.createClassGroup({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId,
      name: input.cohortName.trim(),
      subject: input.subject,
      level: input.level,
      defaultPricePerSession: input.defaultPricePerSession,
      currency: input.currency,
      schedulePattern: null,
      status: "ACTIVE",
      kind: input.kind,
      lifecycle: "DRAFT",
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
      timezone: input.timezone,
      capacity: input.capacity ?? null,
      waitlistEnabled: input.waitlistEnabled ?? false,
      deliveryMode: input.deliveryMode,
      communityUrl: input.communityUrl ?? null,
      programId: input.programId,
      createdAt: now,
      updatedAt: now,
    });

    let createdSessionCount = 0;
    if (input.generateSessionsFromTemplates && input.sessionStartAt) {
      const templates = await this.repo.listProgramSessionTemplates(
        tenantId,
        workspaceId,
        program.id
      );
      let cursor = new Date(input.sessionStartAt);
      for (const template of templates) {
        const durationMin = template.defaultDurationMin ?? 120;
        const session: ClassSessionEntity = {
          id: this.idGenerator.newId(),
          tenantId,
          workspaceId,
          classGroupId: classGroup.id,
          startsAt: new Date(cursor),
          endsAt: new Date(cursor.getTime() + durationMin * 60_000),
          topic: template.title ?? null,
          notes: null,
          status: "PLANNED",
          type: template.type,
          meetingProvider: null,
          meetingJoinUrl: null,
          meetingExternalId: null,
          createdAt: now,
          updatedAt: now,
        };
        await this.repo.createSession(session);
        createdSessionCount += 1;
        cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    const milestoneTemplates = await this.repo.listProgramMilestoneTemplates(
      tenantId,
      workspaceId,
      program.id
    );

    let createdMilestoneCount = 0;
    for (const template of milestoneTemplates) {
      const milestone: ClassMilestoneEntity = {
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        classGroupId: classGroup.id,
        programMilestoneTemplateId: template.id,
        title: template.title,
        type: template.type,
        dueAt: null,
        required: template.required,
        index: template.index,
        createdAt: now,
        updatedAt: now,
      };
      await this.repo.createMilestone(milestone);
      createdMilestoneCount += 1;
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.cohort.created",
      entityType: "ClassProgram",
      entityId: program.id,
      metadata: {
        classGroupId: classGroup.id,
        createdSessionCount,
        createdMilestoneCount,
      },
    });

    const output = {
      classGroupId: classGroup.id,
      createdSessionCount,
      createdMilestoneCount,
    };

    if (input.idempotencyKey) {
      await this.idempotency.store(this.actionKey, tenantId, input.idempotencyKey, {
        body: output,
      });
    }

    return output;
  }
}
