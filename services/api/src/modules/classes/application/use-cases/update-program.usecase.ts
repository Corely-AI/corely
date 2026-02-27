import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateProgramInput } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsManage } from "../../policies/assert-can-classes";
import type {
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
} from "../../domain/entities/classes.entities";
import {
  assertValidExpectedSessionsCount,
  assertValidMilestoneTemplates,
  assertValidProgramTitle,
  assertValidSessionTemplates,
} from "../../domain/rules/program.rules";

type UpdateProgramParams = UpdateProgramInput & { programId: string };

@RequireTenant()
export class UpdateProgramUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: UpdateProgramParams,
    ctx: UseCaseContext
  ): Promise<{
    program: ClassProgramEntity;
    sessionTemplates: ClassProgramSessionTemplateEntity[];
    milestoneTemplates: ClassProgramMilestoneTemplateEntity[];
  }> {
    assertCanProgramsManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    if (input.title !== undefined) {
      assertValidProgramTitle(input.title);
    }
    assertValidExpectedSessionsCount(input.expectedSessionsCount);
    if (input.sessionTemplates) {
      assertValidSessionTemplates(input.sessionTemplates);
    }
    if (input.milestoneTemplates) {
      assertValidMilestoneTemplates(input.milestoneTemplates);
    }

    const existing = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!existing) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    const now = this.clock.now();
    const program = await this.repo.updateProgram(tenantId, workspaceId, input.programId, {
      title: input.title,
      description: input.description ?? undefined,
      levelTag: input.levelTag ?? undefined,
      expectedSessionsCount:
        input.expectedSessionsCount !== undefined ? input.expectedSessionsCount : undefined,
      defaultTimezone: input.defaultTimezone ?? undefined,
      updatedAt: now,
    });

    const sessionTemplates =
      input.sessionTemplates === undefined
        ? await this.repo.listProgramSessionTemplates(tenantId, workspaceId, input.programId)
        : await this.repo.replaceProgramSessionTemplates(
            tenantId,
            workspaceId,
            input.programId,
            input.sessionTemplates.map((template) => ({
              id: this.idGenerator.newId(),
              tenantId,
              workspaceId,
              programId: input.programId,
              index: template.index,
              title: template.title ?? null,
              defaultDurationMin: template.defaultDurationMin ?? null,
              type: template.type,
              createdAt: now,
              updatedAt: now,
            }))
          );

    const milestoneTemplates =
      input.milestoneTemplates === undefined
        ? await this.repo.listProgramMilestoneTemplates(tenantId, workspaceId, input.programId)
        : await this.repo.replaceProgramMilestoneTemplates(
            tenantId,
            workspaceId,
            input.programId,
            input.milestoneTemplates.map((template) => ({
              id: this.idGenerator.newId(),
              tenantId,
              workspaceId,
              programId: input.programId,
              title: template.title,
              type: template.type,
              required: template.required,
              index: template.index,
              createdAt: now,
              updatedAt: now,
            }))
          );

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.updated",
      entityType: "ClassProgram",
      entityId: program.id,
      metadata: {
        sessionTemplateCount: sessionTemplates.length,
        milestoneTemplateCount: milestoneTemplates.length,
      },
    });

    return {
      program,
      sessionTemplates,
      milestoneTemplates,
    };
  }
}
