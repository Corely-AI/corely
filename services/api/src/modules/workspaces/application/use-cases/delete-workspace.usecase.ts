import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DeleteWorkspaceInput, DeleteWorkspaceOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../../shared/ports/idempotency-storage.port";

export interface DeleteWorkspaceCommand extends DeleteWorkspaceInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
}

@Injectable()
export class DeleteWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort
  ) {}

  async execute(command: DeleteWorkspaceCommand): Promise<DeleteWorkspaceOutput> {
    // Check idempotency
    if (command.idempotencyKey) {
      const cached = await this.idempotency.get(
        "delete-workspace",
        command.tenantId,
        command.idempotencyKey
      );
      if (cached) {
        return cached.body as DeleteWorkspaceOutput;
      }
    }

    // Check workspace exists
    const existing = await this.workspaceRepo.getWorkspaceById(
      command.tenantId,
      command.workspaceId
    );

    if (!existing) {
      throw new NotFoundException("Workspace not found");
    }

    // Check user is owner (or at least has access for now, but user said "restricted to owners in a future update")
    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      command.workspaceId,
      command.userId
    );

    if (!membership || membership.role !== "OWNER") {
      throw new ForbiddenException("Only workspace owners can delete the workspace");
    }

    // Soft delete
    await this.workspaceRepo.softDeleteWorkspace(command.tenantId, command.workspaceId);

    const result: DeleteWorkspaceOutput = {
      success: true,
    };

    // Cache result
    if (command.idempotencyKey) {
      await this.idempotency.store("delete-workspace", command.tenantId, command.idempotencyKey, {
        statusCode: 200,
        body: result,
      });
    }

    return result;
  }
}
