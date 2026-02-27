import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanProgramsManage } from "../../policies/assert-can-classes";

@RequireTenant()
export class DeleteProgramUseCase {
  constructor(
    private readonly repo: ClassesRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(input: { programId: string }, ctx: UseCaseContext): Promise<void> {
    assertCanProgramsManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const existing = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!existing) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    await this.repo.deleteProgram(tenantId, workspaceId, input.programId);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "classes.program.deleted",
      entityType: "ClassProgram",
      entityId: input.programId,
      metadata: {
        title: existing.title,
      },
    });
  }
}
