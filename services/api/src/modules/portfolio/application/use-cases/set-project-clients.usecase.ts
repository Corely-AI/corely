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
import type { SetProjectClientsInput } from "@corely/contracts";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import {
  CLIENT_REPOSITORY_PORT,
  type ClientRepositoryPort,
} from "../ports/client-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type SetProjectClientsParams = SetProjectClientsInput & { projectId: string };

@RequireTenant()
@Injectable()
export class SetProjectClientsUseCase extends BaseUseCase<
  SetProjectClientsParams,
  { updated: true }
> {
  constructor(
    @Inject(PROJECT_REPOSITORY_PORT) private readonly projectRepo: ProjectRepositoryPort,
    @Inject(CLIENT_REPOSITORY_PORT) private readonly clientRepo: ClientRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: SetProjectClientsParams,
    ctx: UseCaseContext
  ): Promise<Result<{ updated: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const project = await this.projectRepo.findById(
      ctx.tenantId!,
      ctx.workspaceId,
      input.projectId
    );
    if (!project) {
      return err(new NotFoundError("Project not found"));
    }

    const uniqueClientIds = Array.from(new Set(input.clientIds ?? []));
    if (uniqueClientIds.length > 0) {
      const clients = await this.clientRepo.findByIds(
        ctx.tenantId!,
        ctx.workspaceId,
        uniqueClientIds
      );
      if (clients.length !== uniqueClientIds.length) {
        return err(new ValidationError("One or more clients not found"));
      }
      const invalid = clients.find((client) => client.showcaseId !== project.showcaseId);
      if (invalid) {
        return err(new ValidationError("Clients must belong to the same showcase"));
      }
    }

    await this.projectRepo.setClients(ctx.tenantId!, ctx.workspaceId, project.id, uniqueClientIds);
    return ok({ updated: true });
  }
}
