import { NotFoundError } from "@corely/domain";
import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanCohortManage } from "../../policies/assert-can-classes";
import type {
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
} from "../../domain/entities/classes.entities";

@RequireTenant()
export class GetProgramUseCase {
  constructor(private readonly repo: ClassesRepositoryPort) {}

  async execute(
    input: { programId: string },
    ctx: UseCaseContext
  ): Promise<{
    program: ClassProgramEntity;
    sessionTemplates: ClassProgramSessionTemplateEntity[];
    milestoneTemplates: ClassProgramMilestoneTemplateEntity[];
  }> {
    assertCanCohortManage(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const program = await this.repo.findProgramById(tenantId, workspaceId, input.programId);
    if (!program) {
      throw new NotFoundError("Program not found", { code: "Classes:ProgramNotFound" });
    }

    const [sessionTemplates, milestoneTemplates] = await Promise.all([
      this.repo.listProgramSessionTemplates(tenantId, workspaceId, program.id),
      this.repo.listProgramMilestoneTemplates(tenantId, workspaceId, program.id),
    ]);

    return {
      program,
      sessionTemplates,
      milestoneTemplates,
    };
  }
}
