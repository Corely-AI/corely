import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { UpdateWorkspaceInput, UpdateWorkspaceOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../../shared/ports/idempotency-storage.port";

export interface UpdateWorkspaceCommand extends UpdateWorkspaceInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
  idempotencyKey?: string;
}

@Injectable()
export class UpdateWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort
  ) {}

  async execute(command: UpdateWorkspaceCommand): Promise<UpdateWorkspaceOutput> {
    // Check idempotency
    if (command.idempotencyKey) {
      const cached = await this.idempotency.get(
        "update-workspace",
        command.tenantId,
        command.idempotencyKey
      );
      if (cached) {
        return cached.body as UpdateWorkspaceOutput;
      }
    }

    // Check user has access
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    // Get workspace to access legalEntityId
    const existing = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );

    if (!existing) {
      throw new NotFoundException("Workspace not found");
    }

    // Update legal entity fields
    const legalEntityUpdates: any = {};
    if (command.legalName !== undefined) {
      legalEntityUpdates.legalName = command.legalName;
    }
    if (command.countryCode !== undefined) {
      legalEntityUpdates.countryCode = command.countryCode;
    }
    if (command.currency !== undefined) {
      legalEntityUpdates.currency = command.currency;
    }
    if (command.taxId !== undefined) {
      legalEntityUpdates.taxId = command.taxId;
    }
    if (command.vatId !== undefined) {
      legalEntityUpdates.vatId = command.vatId;
    }
    if (command.phone !== undefined) {
      legalEntityUpdates.phone = command.phone;
    }
    if (command.email !== undefined) {
      legalEntityUpdates.email = command.email;
    }
    if (command.website !== undefined) {
      legalEntityUpdates.website = command.website;
    }
    if (command.address !== undefined) {
      legalEntityUpdates.address = command.address;
    }
    if (command.bankAccount !== undefined) {
      legalEntityUpdates.bankAccount = command.bankAccount;
    }

    if (Object.keys(legalEntityUpdates).length > 0) {
      await this.workspaceRepo.updateLegalEntity(
        command.tenantId,
        existing.legalEntityId,
        legalEntityUpdates
      );
    }

    // Update workspace fields
    const workspaceUpdates: any = {};
    if (command.name !== undefined) {
      workspaceUpdates.name = command.name;
    }
    if (command.slug !== undefined) {
      const normalizedSlug = slugify(command.slug);
      if (!normalizedSlug) {
        throw new BadRequestException("Invalid workspace slug");
      }
      if (existing.slug !== normalizedSlug) {
        const conflict = await this.workspaceRepo.getWorkspaceBySlug(normalizedSlug);
        if (conflict && conflict.id !== existing.id) {
          throw new ConflictException("Workspace slug already in use");
        }
      }
      workspaceUpdates.slug = normalizedSlug;
    }
    if (command.publicEnabled !== undefined) {
      workspaceUpdates.publicEnabled = command.publicEnabled;
    }
    if (command.publicModules !== undefined) {
      workspaceUpdates.publicModules = command.publicModules;
    }
    if (command.invoiceSettings !== undefined) {
      workspaceUpdates.invoiceSettings = command.invoiceSettings;
    }

    if (Object.keys(workspaceUpdates).length > 0) {
      await this.workspaceRepo.updateWorkspace(
        command.tenantId,
        command.workspaceId,
        workspaceUpdates
      );
    }

    // Fetch updated workspace
    const updated = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );

    const result: UpdateWorkspaceOutput = {
      workspace: {
        id: updated!.id,
        legalEntityId: updated!.legalEntityId,
        name: updated!.name,
        slug: updated!.slug,
        publicEnabled: updated!.publicEnabled ?? false,
        publicModules: updated!.publicModules ?? undefined,
        kind: updated!.legalEntity?.kind as any,
        legalName: updated!.legalEntity?.legalName,
        countryCode: updated!.legalEntity?.countryCode,
        currency: updated!.legalEntity?.currency,
        taxId: updated!.legalEntity?.taxId,
        vatId: updated!.legalEntity?.vatId,
        phone: updated!.legalEntity?.phone,
        email: updated!.legalEntity?.email,
        website: updated!.legalEntity?.website,
        address: updated!.legalEntity?.address as any,
        bankAccount: updated!.legalEntity?.bankAccount as any,
        invoiceSettings: updated!.invoiceSettings as any,
        onboardingStatus: updated!.onboardingStatus as any,
        onboardingCompletedAt: updated!.onboardingCompletedAt?.toISOString(),
        createdAt: updated!.createdAt.toISOString(),
        updatedAt: updated!.updatedAt.toISOString(),
      },
    };

    // Cache result
    if (command.idempotencyKey) {
      await this.idempotency.store("update-workspace", command.tenantId, command.idempotencyKey, {
        statusCode: 200,
        body: result,
      });
    }

    return result;
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
