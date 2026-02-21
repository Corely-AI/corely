import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpsertProgramMilestoneTemplatesBody } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsManage } from "../../policies/assert-can-classes";
import { assertValidMilestoneTemplates } from "../../domain/rules/program.rules";

@RequireTenant()
export class ReplaceProgramMilestoneTemplatesUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { programId: string } & UpsertProgramMilestoneTemplatesBody,
    ctx: UseCaseContext
  ) {
    assertCanProgramsManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    assertValidMilestoneTemplates(input.items);

    const existing = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!existing) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    const now = this.clock.now();
    const templates = await this.repo.replaceProgramMilestoneTemplates(
      tenantId,
      workspaceId,
      input.programId,
      input.items.map((item) => ({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        programId: input.programId,
        title: item.title,
        type: item.type,
        required: item.required,
        index: item.index,
        createdAt: now,
        updatedAt: now,
      }))
    );

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.milestone_templates.replaced",
      entityType: "ClassProgram",
      entityId: input.programId,
      metadata: {
        milestoneTemplateCount: templates.length,
      },
    });

    return templates;
  }
}
