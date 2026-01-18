import { Inject, Injectable } from "@nestjs/common";
import type { CreateWorkspaceInput, CreateWorkspaceOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { ID_GENERATOR_TOKEN } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../../shared/ports/idempotency-storage.port";
import { EnvService } from "@corely/config";

export interface CreateWorkspaceCommand extends CreateWorkspaceInput {
  tenantId: string;
  userId: string;
  idempotencyKey?: string;
}

@Injectable()
export class CreateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(ID_GENERATOR_TOKEN)
    private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN)
    private readonly clock: ClockPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort,
    private readonly env: EnvService
  ) {}

  async execute(command: CreateWorkspaceCommand): Promise<CreateWorkspaceOutput> {
    // Check idempotency if key provided
    if (command.idempotencyKey) {
      const cached = await this.idempotency.get(
        "create-workspace",
        command.tenantId,
        command.idempotencyKey
      );
      if (cached) {
        return cached.body as CreateWorkspaceOutput;
      }
    }

    const isEe = this.env.EDITION === "ee";

    // OSS: reuse existing default workspace if present for the user/tenant
    if (!isEe) {
      const existing = await this.workspaceRepo.listWorkspacesByTenant(
        command.tenantId,
        command.userId
      );
      if (existing.length > 0) {
        const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
          existing[0].id,
          command.userId
        );
        return this.mapToOutput(existing[0], membership);
      }
    }

    // Create legal entity first
    const legalEntityId = this.idGenerator.newId();
    const legalEntity = await this.workspaceRepo.createLegalEntity({
      id: legalEntityId,
      tenantId: command.tenantId,
      kind: command.kind,
      legalName: command.legalName || command.name,
      countryCode: command.countryCode || "US",
      currency: command.currency || "USD",
      taxId: command.taxId,
      address: command.address,
      bankAccount: command.bankAccount,
    });

    // Create workspace
    const workspaceId = isEe ? this.idGenerator.newId() : command.tenantId;
    const workspace = await this.workspaceRepo.createWorkspace({
      id: workspaceId,
      tenantId: command.tenantId,
      legalEntityId: legalEntity.id,
      name: command.name,
      onboardingStatus: "PROFILE",
      invoiceSettings: command.invoiceSettings,
    });

    // Create owner membership for the creator
    const membershipId = this.idGenerator.newId();
    const membership = await this.workspaceRepo.createMembership({
      id: membershipId,
      workspaceId: workspace.id,
      userId: command.userId,
      role: "OWNER",
      status: "ACTIVE",
    });

    const result = this.mapToOutput(workspace, membership, legalEntity);

    // Store in idempotency cache
    if (command.idempotencyKey) {
      await this.idempotency.store("create-workspace", command.tenantId, command.idempotencyKey, {
        statusCode: 200,
        body: result,
      });
    }

    return result;
  }

  private mapToOutput(workspace: any, membership?: any, legalEntity?: any): CreateWorkspaceOutput {
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        kind: (legalEntity?.kind ?? "PERSONAL") as any,
        legalName: (legalEntity?.legalName ?? workspace.name) as any,
        countryCode: (legalEntity?.countryCode ?? "US") as any,
        currency: (legalEntity?.currency ?? "USD") as any,
        taxId: legalEntity?.taxId,
        address: legalEntity?.address as any,
        bankAccount: legalEntity?.bankAccount as any,
        invoiceSettings: workspace.invoiceSettings as any,
        onboardingStatus: workspace.onboardingStatus as any,
        onboardingCompletedAt: workspace.onboardingCompletedAt?.toISOString() || undefined,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      membership: membership
        ? {
            id: membership.id,
            workspaceId: membership.workspaceId,
            userId: membership.userId,
            role: membership.role as any,
            status: membership.status as any,
            createdAt: membership.createdAt.toISOString(),
          }
        : undefined,
    };
  }
}
