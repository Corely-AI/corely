import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpsertProgramSessionTemplatesBody } from "@corely/contracts/classes";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import type { IdGeneratorPort } from "../ports/id-generator.port";
import type { ClockPort } from "../ports/clock.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsManage } from "../../policies/assert-can-classes";
import { assertValidSessionTemplates } from "../../domain/rules/program.rules";

@RequireTenant()
export class ReplaceProgramSessionTemplatesUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(
    input: { programId: string } & UpsertProgramSessionTemplatesBody,
    ctx: UseCaseContext
  ) {
    assertCanProgramsManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    assertValidSessionTemplates(input.items);

    const existing = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!existing) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    const now = this.clock.now();
    const templates = await this.repo.replaceProgramSessionTemplates(
      tenantId,
      workspaceId,
      input.programId,
      input.items.map((item) => ({
        id: this.idGenerator.newId(),
        tenantId,
        workspaceId,
        programId: input.programId,
        index: item.index,
        title: item.title ?? null,
        defaultDurationMin: item.defaultDurationMin ?? null,
        type: item.type,
        createdAt: now,
        updatedAt: now,
      }))
    );

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.session_templates.replaced",
      entityType: "ClassProgram",
      entityId: input.programId,
      metadata: {
        sessionTemplateCount: templates.length,
      },
    });

    return templates;
  }
}
