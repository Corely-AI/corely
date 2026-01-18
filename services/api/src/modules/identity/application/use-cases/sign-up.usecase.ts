import { Injectable, Inject } from "@nestjs/common";
import { createHash } from "crypto";
import { Email } from "../../domain/value-objects/email.vo";
import { Password } from "../../domain/value-objects/password.vo";
import { User } from "../../domain/entities/user.entity";
import { Tenant } from "../../domain/entities/tenant.entity";
import { Membership } from "../../domain/entities/membership.entity";
import {
  UserCreatedEvent,
  TenantCreatedEvent,
  MembershipCreatedEvent,
} from "../../domain/events/identity.events";
import { type UserRepositoryPort, USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import {
  type TenantRepositoryPort,
  TENANT_REPOSITORY_TOKEN,
} from "../ports/tenant-repository.port";
import {
  type MembershipRepositoryPort,
  MEMBERSHIP_REPOSITORY_TOKEN,
} from "../ports/membership-repository.port";
import { type PasswordHasherPort, PASSWORD_HASHER_TOKEN } from "../ports/password-hasher.port";
import { type TokenServicePort, TOKEN_SERVICE_TOKEN } from "../ports/token-service.port";
import { type OutboxPort, OUTBOX_PORT } from "@corely/kernel";
import { type AuditPort, AUDIT_PORT_TOKEN } from "../ports/audit.port";
import { type RoleRepositoryPort, ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import {
  type RolePermissionGrantRepositoryPort,
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
} from "../ports/role-permission-grant-repository.port";
import {
  type PermissionCatalogPort,
  PERMISSION_CATALOG_PORT,
} from "../ports/permission-catalog.port";
import { type ClockPort, CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import {
  type RefreshTokenRepositoryPort,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from "../ports/refresh-token-repository.port";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../../shared/ports/idempotency-storage.port";
import {
  type IdGeneratorPort,
  ID_GENERATOR_TOKEN,
} from "../../../../shared/ports/id-generator.port";
import { type RequestContext } from "../../../../shared/context/request-context";
import { ConflictError, ValidationError } from "../../../../shared/errors/domain-errors";
import { buildDefaultRoleGrants, type DefaultRoleKey } from "../../permissions/default-role-grants";
import { EnvService } from "@corely/config";
import type { WorkspaceRepositoryPort } from "../../../workspaces/application/ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../../../workspaces/application/ports/workspace-repository.port";

export interface SignUpInput {
  email: string;
  password: string;
  tenantName: string;
  idempotencyKey: string;
  context: RequestContext;
  userName?: string;
}

export interface SignUpOutput {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  accessToken: string;
  refreshToken: string;
}

const SIGN_UP_ACTION = "identity.sign_up";

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly idempotency: IdempotencyStoragePort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly env: EnvService,
    @Inject(WORKSPACE_REPOSITORY_PORT) private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(input: SignUpInput): Promise<SignUpOutput> {
    console.log("[SignUp] Starting signup with input:", {
      email: input.email,
      hasPassword: !!input.password,
      tenantName: input.tenantName,
      idempotencyKey: input.idempotencyKey,
    });

    // Generate idempotency key if not provided
    const idempotencyKey = input.idempotencyKey || this.idGenerator.newId();
    console.log("[SignUp] Using idempotency key:", idempotencyKey);

    const cached = await this.idempotency.get(SIGN_UP_ACTION, null, idempotencyKey);
    if (cached) {
      return cached.body as SignUpOutput;
    }

    this.validate(input);

    const email = Email.create(input.email);
    const password = Password.create(input.password);

    console.log("[SignUp] Checking for existing user with email:", email.getValue());
    const existingUser = await this.userRepo.findByEmail(email.getValue());
    if (existingUser) {
      console.log("[SignUp] User already exists:", existingUser.id);
      throw new ConflictError("User with this email already exists");
    }
    console.log("[SignUp] No existing user found");

    const isEe = this.env.EDITION === "ee";
    const tenantId = isEe ? this.idGenerator.newId() : this.env.DEFAULT_TENANT_ID;
    console.log("[SignUp] Edition check:", { isEe, tenantId });

    let slug: string;
    let tenantName: string;
    let tenantCreated = false;

    if (isEe) {
      // EE mode: tenant name is required
      if (!input.tenantName) {
        throw new ValidationError("Tenant name is required in EE mode");
      }
      tenantName = input.tenantName;
      slug = this.generateSlug(input.tenantName);
      const existingTenant = await this.tenantRepo.findBySlug(slug);
      if (existingTenant) {
        throw new ConflictError("Tenant with this slug already exists");
      }
      const tenant = Tenant.create(tenantId, input.tenantName, slug);
      await this.tenantRepo.create(tenant);
      tenantCreated = true;
    } else {
      // OSS mode: use default tenant, ignore provided tenant name
      tenantName = input.tenantName || "Default Organization";
      const ossTenant = await this.resolveTenantForOss(tenantId, tenantName);
      slug = ossTenant.slug;
      tenantName = ossTenant.name;
      tenantCreated = ossTenant.created;
    }

    const userId = this.idGenerator.newId();
    console.log("[SignUp] Creating user:", { userId, email: email.getValue(), tenantId });
    const passwordHash = await this.passwordHasher.hash(password.getValue());
    const user = User.create(userId, email, passwordHash, input.userName || null);
    try {
      await this.userRepo.create(user);
      console.log("[SignUp] User created successfully");
    } catch (error) {
      console.error("[SignUp] Error creating user:", error);
      throw error;
    }

    const defaultRoles = await this.ensureDefaultRoles(tenantId);
    await this.seedDefaultRoleGrants(tenantId, userId, defaultRoles);
    const ownerRole = defaultRoles.OWNER;
    const membershipId = this.idGenerator.newId();
    const membership = Membership.create(membershipId, tenantId, userId, ownerRole);
    await this.membershipRepo.create(membership);

    // OSS mode: create default workspace during signup
    if (!isEe) {
      console.log("[SignUp] Creating default workspace for OSS mode");
      try {
        await this.createDefaultWorkspaceForOss(tenantId, userId, input.userName || null);
        console.log("[SignUp] Default workspace created successfully");
      } catch (error) {
        console.error("[SignUp] Error creating default workspace:", error);
        throw error;
      }
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId,
      email: email.getValue(),
      tenantId,
      roleIds: [ownerRole],
    });
    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();
    await this.refreshTokenRepo.create({
      id: this.idGenerator.newId(),
      userId,
      tenantId,
      tokenHash: await this.hashToken(refreshToken),
      expiresAt: new Date(this.clock.now().getTime() + refreshTokenExpiresInMs),
    });

    await this.emitOutboxEvents(
      tenantId,
      tenantName,
      userId,
      membershipId,
      ownerRole,
      email.getValue(),
      input.userName || null,
      slug,
      tenantCreated
    );

    await this.audit.write({
      tenantId,
      actorUserId: userId,
      action: "identity.sign_up",
      targetType: "User",
      targetId: userId,
      context: input.context,
    });

    const response: SignUpOutput = {
      userId,
      email: email.getValue(),
      tenantId,
      tenantName: input.tenantName,
      membershipId,
      accessToken,
      refreshToken,
    };

    await this.idempotency.store(SIGN_UP_ACTION, null, idempotencyKey, { body: response });
    return response;
  }

  private validate(input: SignUpInput) {
    if (!input.email || !input.email.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (!input.password || input.password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }
    if (!input.tenantName && this.env.EDITION === "ee") {
      throw new ValidationError("Tenant name is required");
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\\s-]/g, "")
      .replace(/\\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
  }

  /**
   * OSS mode: ensure the configured default tenant exists and return its slug.
   */
  private async resolveTenantForOss(
    tenantId: string,
    tenantName: string
  ): Promise<{ slug: string; name: string; created: boolean }> {
    if (!tenantId) {
      throw new ValidationError("DEFAULT_TENANT_ID is not configured");
    }

    const existing = await this.tenantRepo.findById(tenantId);
    if (existing) {
      return { slug: existing.getSlug(), name: existing.getName(), created: false };
    }

    let slug = this.generateSlug(tenantName) || tenantId;
    if (await this.tenantRepo.slugExists(slug)) {
      slug = this.generateSlug(tenantId) || tenantId;
    }

    const tenant = Tenant.create(tenantId, tenantName, slug);
    await this.tenantRepo.create(tenant);
    return { slug, name: tenantName, created: true };
  }

  private async ensureDefaultRoles(tenantId: string): Promise<Record<DefaultRoleKey, string>> {
    const roles = [
      { key: "OWNER" as const, name: "Owner" },
      { key: "ADMIN" as const, name: "Admin" },
      { key: "ACCOUNTANT" as const, name: "Accountant" },
      { key: "STAFF" as const, name: "Staff" },
      { key: "READ_ONLY" as const, name: "Read-only" },
    ];

    const results: Record<DefaultRoleKey, string> = {
      OWNER: "",
      ADMIN: "",
      ACCOUNTANT: "",
      STAFF: "",
      READ_ONLY: "",
    };

    for (const role of roles) {
      const existing = await this.roleRepo.findBySystemKey(tenantId, role.key);
      if (existing) {
        results[role.key] = existing.id;
        continue;
      }
      const id = this.idGenerator.newId();
      await this.roleRepo.create({
        id,
        tenantId,
        name: role.name,
        systemKey: role.key,
        isSystem: true,
      });
      results[role.key] = id;
    }

    return results;
  }

  private async seedDefaultRoleGrants(
    tenantId: string,
    actorUserId: string,
    roles: Record<DefaultRoleKey, string>
  ) {
    const catalog = this.catalogPort.getCatalog();
    const grants = buildDefaultRoleGrants(catalog);

    await this.grantRepo.replaceAll(tenantId, roles.OWNER, grants.OWNER, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.ADMIN, grants.ADMIN, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.ACCOUNTANT, grants.ACCOUNTANT, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.STAFF, grants.STAFF, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.READ_ONLY, grants.READ_ONLY, actorUserId);
  }

  private async emitOutboxEvents(
    tenantId: string,
    tenantName: string,
    userId: string,
    membershipId: string,
    roleId: string,
    email: string,
    name: string | null,
    slug: string,
    tenantCreated: boolean
  ) {
    const userCreatedEvent = new UserCreatedEvent(userId, email, name, null);
    await this.outbox.enqueue({
      tenantId,
      eventType: userCreatedEvent.eventType,
      payload: userCreatedEvent,
    });

    if (tenantCreated) {
      const tenantCreatedEvent = new TenantCreatedEvent(tenantId, tenantName, slug);
      await this.outbox.enqueue({
        tenantId,
        eventType: tenantCreatedEvent.eventType,
        payload: tenantCreatedEvent,
      });
    }

    const membershipCreatedEvent = new MembershipCreatedEvent(
      membershipId,
      tenantId,
      userId,
      roleId
    );
    await this.outbox.enqueue({
      tenantId,
      eventType: membershipCreatedEvent.eventType,
      payload: membershipCreatedEvent,
    });
  }

  private async hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Creates the default workspace for OSS mode during signup.
   * OSS supports exactly one workspace per tenant.
   */
  private async createDefaultWorkspaceForOss(
    tenantId: string,
    userId: string,
    workspaceName: string
  ): Promise<void> {
    console.log("[SignUp:Workspace] Creating default workspace:", {
      tenantId,
      userId,
      workspaceName,
    });

    // Check if workspace already exists (in OSS mode, workspace ID = tenant ID)
    const existingWorkspace = await this.workspaceRepo.getWorkspaceById(tenantId, tenantId);
    if (existingWorkspace) {
      console.log("[SignUp:Workspace] Workspace already exists, creating membership only");
      // Workspace exists, just create membership for this user
      const workspaceMembershipId = this.idGenerator.newId();
      await this.workspaceRepo.createMembership({
        id: workspaceMembershipId,
        workspaceId: tenantId,
        userId,
        role: "OWNER",
        status: "ACTIVE",
      });
      console.log("[SignUp:Workspace] Membership created for existing workspace");
      return;
    }

    console.log("[SignUp:Workspace] No existing workspace found, creating new one");

    // Create legal entity with placeholder name - will be configured during onboarding
    const legalEntityId = this.idGenerator.newId();
    const defaultLegalName = workspaceName || "My Business";
    console.log(
      "[SignUp:Workspace] Creating legal entity:",
      legalEntityId,
      "with default name:",
      defaultLegalName
    );
    try {
      await this.workspaceRepo.createLegalEntity({
        id: legalEntityId,
        tenantId,
        kind: "PERSONAL",
        legalName: defaultLegalName,
        countryCode: "US",
        currency: "USD",
      });
      console.log("[SignUp:Workspace] Legal entity created successfully");
    } catch (error) {
      console.error("[SignUp:Workspace] Error creating legal entity:", error);
      throw error;
    }

    // Create workspace with same ID as tenant (OSS convention)
    const defaultWorkspaceName = workspaceName || "My Workspace";
    console.log(
      "[SignUp:Workspace] Creating workspace with ID:",
      tenantId,
      "and name:",
      defaultWorkspaceName
    );
    try {
      await this.workspaceRepo.createWorkspace({
        id: tenantId,
        tenantId,
        legalEntityId,
        name: defaultWorkspaceName,
        onboardingStatus: "NEW",
      });
      console.log("[SignUp:Workspace] Workspace created successfully");
    } catch (error) {
      console.error("[SignUp:Workspace] Error creating workspace:", error);
      throw error;
    }

    // Create workspace membership
    const workspaceMembershipId = this.idGenerator.newId();
    console.log("[SignUp:Workspace] Creating workspace membership:", workspaceMembershipId);
    try {
      await this.workspaceRepo.createMembership({
        id: workspaceMembershipId,
        workspaceId: tenantId,
        userId,
        role: "OWNER",
        status: "ACTIVE",
      });
      console.log("[SignUp:Workspace] Workspace membership created successfully");
    } catch (error) {
      console.error("[SignUp:Workspace] Error creating workspace membership:", error);
      throw error;
    }
  }
}
