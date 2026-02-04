import { Inject, Injectable } from "@nestjs/common";
import type { CreateTenantUserInput, CreateTenantUserResponse } from "@corely/contracts";
import { ValidationFailedError } from "@corely/domain";
import { OUTBOX_PORT, type OutboxPort, type UseCaseContext } from "@corely/kernel";
import { Email } from "../../domain/value-objects/email.vo";
import { User } from "../../domain/entities/user.entity";
import { Membership } from "../../domain/entities/membership.entity";
import { MembershipCreatedEvent } from "../../domain/events/identity.events";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import { ROLE_REPOSITORY_TOKEN, type RoleRepositoryPort } from "../ports/role-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import { PASSWORD_HASHER_TOKEN, type PasswordHasherPort } from "../ports/password-hasher.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "../../../../shared/ports/idempotency-storage.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../ports/audit.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";
import { toTenantUserDto } from "../mappers/tenant-user.mapper";

export interface CreateTenantUserCommand extends CreateTenantUserInput {
  tenantId: string;
}

const CREATE_TENANT_USER_ACTION = "identity.tenant_user.create";

@Injectable()
export class CreateTenantUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwordHasher: PasswordHasherPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(
    command: CreateTenantUserCommand,
    ctx: UseCaseContext
  ): Promise<CreateTenantUserResponse> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.write, {
      grantRepo: this.grantRepo,
    });

    const idempotencyKey = command.idempotencyKey;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(
        CREATE_TENANT_USER_ACTION,
        command.tenantId,
        idempotencyKey
      );
      if (cached) {
        return cached.body as CreateTenantUserResponse;
      }
    }

    const errors = this.validate(command);
    if (errors.length > 0) {
      throw new ValidationFailedError("Validation failed", errors);
    }

    const role = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!role) {
      throw new ValidationFailedError("Validation failed", [
        { message: "Role not found", members: ["roleId"] },
      ]);
    }

    const email = Email.create(command.email);
    let user = await this.userRepo.findByEmail(email.getValue());

    if (!user) {
      const userId = this.idGenerator.newId();
      const passwordHash = await this.passwordHasher.hash(command.password);
      user = User.create(
        userId,
        email,
        passwordHash,
        command.name ?? null,
        "ACTIVE",
        this.clock.now()
      );
      await this.userRepo.create(user);
    }

    const existingMembership = await this.membershipRepo.findByTenantAndUser(
      command.tenantId,
      user.getId()
    );
    if (existingMembership) {
      throw new ValidationFailedError("Validation failed", [
        { message: "User already belongs to this tenant", members: ["email"] },
      ]);
    }

    const membershipId = this.idGenerator.newId();
    const membership = Membership.create(
      membershipId,
      command.tenantId,
      user.getId(),
      command.roleId,
      this.clock.now()
    );
    await this.membershipRepo.create(membership);

    const membershipCreatedEvent = new MembershipCreatedEvent(
      membershipId,
      command.tenantId,
      user.getId(),
      command.roleId
    );
    await this.outbox.enqueue({
      tenantId: command.tenantId,
      eventType: membershipCreatedEvent.eventType,
      payload: membershipCreatedEvent,
    });

    await this.audit.write({
      tenantId: command.tenantId,
      actorUserId: ctx.userId ?? null,
      action: "TenantUserAdded",
      targetType: "Membership",
      targetId: membershipId,
      metadataJson: JSON.stringify({
        email: user.getEmail().getValue(),
        roleId: command.roleId,
        roleName: role.name,
      }),
      context: {
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      },
    });

    const response: CreateTenantUserResponse = {
      user: toTenantUserDto({
        membershipId,
        userId: user.getId(),
        email: user.getEmail().getValue(),
        name: user.getName(),
        status: user.getStatus(),
        roleId: role.id,
        roleName: role.name,
        roleSystemKey: role.systemKey,
      }),
    };

    if (idempotencyKey) {
      await this.idempotency.store(CREATE_TENANT_USER_ACTION, command.tenantId, idempotencyKey, {
        statusCode: 201,
        body: response,
      });
    }

    return response;
  }

  private validate(input: CreateTenantUserInput) {
    const errors: Array<{ message: string; members: string[] }> = [];

    if (!input.email || !input.email.includes("@")) {
      errors.push({ message: "Valid email is required", members: ["email"] });
    }
    if (!input.password || input.password.length < 8) {
      errors.push({ message: "Password must be at least 8 characters", members: ["password"] });
    }
    if (!input.roleId) {
      errors.push({ message: "Role is required", members: ["roleId"] });
    }

    return errors;
  }
}
