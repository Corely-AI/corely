import { Injectable } from "@nestjs/common";
import { ok, err, Result, UseCaseError, LoggerPort, UseCaseContext, isErr } from "@corely/kernel";
import { Email } from "../../../identity/domain/value-objects/email.vo";
import { User } from "../../../identity/domain/entities/user.entity";
import { UserRepositoryPort } from "../../../identity/application/ports/user-repository.port";
import { PartyRepoPort } from "../../../party/application/ports/party-repository.port";
import { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { PasswordHasherPort } from "../../../identity/application/ports/password-hasher.port";
import { RoleRepositoryPort } from "../../../identity/application/ports/role-repository.port";
import { MembershipRepositoryPort } from "../../../identity/application/ports/membership-repository.port";
import { Membership } from "../../../identity/domain/entities/membership.entity";

export interface InvitePortalUserInput {
  email: string;
  name?: string;
  partyId: string;
  role: "GUARDIAN" | "STUDENT";
}

@Injectable()
export class InvitePortalUserUseCase {
  constructor(
    private readonly useCaseDeps: {
      logger: LoggerPort;
      userRepo: UserRepositoryPort;
      partyRepo: PartyRepoPort;
      roleRepo: RoleRepositoryPort;
      membershipRepo: MembershipRepositoryPort;
      idGenerator: IdGeneratorPort;
      passwordHasher: PasswordHasherPort;
    }
  ) {}

  async execute(
    input: InvitePortalUserInput,
    ctx: UseCaseContext
  ): Promise<Result<void, UseCaseError>> {
    const email = Email.create(input.email);
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      return err(new UseCaseError("Tenant ID required", "BAD_REQUEST"));
    }

    // 1. Verify party exists
    const party = await this.useCaseDeps.partyRepo.findPartyById(tenantId, input.partyId);
    if (!party) {
      return err(new UseCaseError("Party not found", "NOT_FOUND"));
    }

    // 2. Find or create user
    let user = await this.useCaseDeps.userRepo.findByEmail(email.getValue());
    let isNewUser = false;

    if (!user) {
      const userId = this.useCaseDeps.idGenerator.newId();
      const tempPassword = this.useCaseDeps.idGenerator.newId();
      const passwordHash = await this.useCaseDeps.passwordHasher.hash(tempPassword);

      user = User.create(
        userId,
        email,
        passwordHash,
        input.name ?? party.displayName,
        "ACTIVE",
        new Date(),
        input.partyId
      );

      await this.useCaseDeps.userRepo.create(user);
      isNewUser = true;
    } else {
      // If user exists, update their partyId if not set
      if (!user.getPartyId()) {
        // TODO: We need an updatePartyId method on User or map it in repository
        // For now, let's assume we can't easily update it without a new repository method
        // but we can try to restore and save
      }
    }

    // 3. Ensure membership in tenant with correct role
    // Find role by system key
    const role = await this.useCaseDeps.roleRepo.findBySystemKey(tenantId, input.role);
    if (!role) {
      return err(new UseCaseError(`Role ${input.role} not found in tenant`, "INTERNAL_ERROR"));
    }

    const existingMembership = await this.useCaseDeps.membershipRepo.findByTenantAndUser(
      tenantId,
      user.getId()
    );
    if (!existingMembership) {
      const membershipId = this.useCaseDeps.idGenerator.newId();
      const membership = Membership.create(
        membershipId,
        tenantId,
        user.getId(),
        role.id,
        new Date()
      );
      await this.useCaseDeps.membershipRepo.create(membership);
    }

    this.useCaseDeps.logger.info(`Invited user ${email.getValue()} to portal. New: ${isNewUser}`);

    return ok(undefined);
  }
}
