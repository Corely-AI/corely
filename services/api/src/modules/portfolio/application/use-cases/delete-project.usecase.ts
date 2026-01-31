import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class DeleteProjectUseCase extends BaseUseCase<{ projectId: string }, { deleted: true }> {
  constructor(@Inject(PROJECT_REPOSITORY_PORT) private readonly repo: ProjectRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { projectId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.projectId);
    if (!existing) {
      return err(new NotFoundError("Project not found"));
    }

    await this.repo.delete(ctx.tenantId!, ctx.workspaceId, input.projectId);
    return ok({ deleted: true });
  }
}
