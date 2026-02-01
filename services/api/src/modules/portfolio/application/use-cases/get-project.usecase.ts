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
import type { GetPortfolioProjectOutput } from "@corely/contracts";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import { toPortfolioProjectDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetProjectUseCase extends BaseUseCase<
  { projectId: string },
  GetPortfolioProjectOutput
> {
  constructor(@Inject(PROJECT_REPOSITORY_PORT) private readonly repo: ProjectRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { projectId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetPortfolioProjectOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const project = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.projectId);
    if (!project) {
      return err(new NotFoundError("Project not found"));
    }

    const clientIds = await this.repo.listClientIds(
      ctx.tenantId!,
      ctx.workspaceId,
      input.projectId
    );

    return ok({ project: toPortfolioProjectDto(project), clientIds });
  }
}
