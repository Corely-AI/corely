import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError, ValidationError } from "../../../../shared/errors/domain-errors";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import type { MembershipRepositoryPort } from "../ports/membership-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../ports/membership-repository.port";

export interface DeleteRoleCommand {
  tenantId: string;
  actorUserId: string;
  roleId: string;
}

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const existing = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!existing) {
      throw new NotFoundError("Role not found");
    }

    if (existing.isSystem || existing.systemKey) {
      throw new ValidationError("System roles cannot be deleted");
    }

    const assigned = await this.membershipRepo.existsByRole(command.tenantId, existing.id);
    if (assigned) {
      throw new ValidationError("Role is assigned to members and cannot be deleted");
    }

    await this.roleRepo.delete(command.tenantId, existing.id);
  }
}
