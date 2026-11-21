import {
  TENANT_ADMIN_SESSION_LOCK,
  type TenantAdminSessionLock,
} from "../ports/tenant-admin-session-lock.port";
import { createHash, randomBytes } from "node:crypto";
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import type { TenantAdminSession } from "@corely/contracts";
import { z } from "zod";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../ports/audit.port";
import { ROLE_REPOSITORY_TOKEN, type RoleRepositoryPort } from "../ports/role-repository.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import { hasPlatformPermission } from "../policies/platform-permissions.policy";

export const TENANT_ADMIN_TOKEN_PREFIX = "tenant-admin.";
const recordSchema = z.object({
  userId: z.string(),
  ended: z.boolean(),
});

@Injectable()
export class TenantAdminSessions {
  constructor(
    @Inject(EXT_KV_PORT) private readonly sessions: Pick<ExtKvPort, "get" | "set">,
    @Inject(TENANT_ADMIN_SESSION_LOCK) private readonly lock: TenantAdminSessionLock,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: Pick<AuditPort, "write">,
    @Inject(TENANT_REPOSITORY_TOKEN)
    private readonly tenants: Pick<TenantRepositoryPort, "findById">,
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: Pick<UserRepositoryPort, "findById">,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roles: Pick<RoleRepositoryPort, "findBySystemKey">,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly memberships: Pick<MembershipRepositoryPort, "findByTenantAndUser">,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async start(userId: string, tenantId: string): Promise<TenantAdminSession> {
    const { tenant } = await this.authorize(userId, tenantId);
    const secret = randomBytes(32).toString("base64url");
    const accessToken =
      TENANT_ADMIN_TOKEN_PREFIX + Buffer.from(tenantId).toString("base64url") + "." + secret;
    const storage = this.storageKey(tenantId, secret);
    await this.uow.withinTransaction(async (tx) => {
      await this.sessions.set({ ...storage, value: { userId, ended: false } }, tx);
      await this.audit.write(
        {
          tenantId,
          actorUserId: userId,
          action: "identity.tenant_admin_session.started",
          targetType: "Tenant",
          targetId: tenantId,
          metadataJson: JSON.stringify({ sessionId: storage.key }),
        },
        tx
      );
    });
    return { accessToken, tenantId, tenantName: tenant.getName() };
  }

  async authenticate(token: string) {
    const storage = this.parseToken(token);
    const result = recordSchema.safeParse((await this.sessions.get(storage))?.value);
    if (!result.success || result.data.ended) {
      throw new UnauthorizedException("Tenant admin session ended");
    }
    const { userId } = result.data;
    const { user, role } = await this.authorize(userId, storage.tenantId);
    return {
      userId,
      email: user.getEmail().getValue(),
      tenantId: storage.tenantId,
      roleIds: [role.id],
      tenantAdminRoleId: role.id,
    };
  }

  async end(token: string) {
    const storage = this.parseToken(token);
    await this.uow.withinTransaction(async (tx) => {
      await this.lock.acquire(storage.tenantId, storage.key, tx);
      const result = recordSchema.safeParse((await this.sessions.get(storage, tx))?.value);
      if (!result.success) {
        throw new UnauthorizedException("Invalid tenant admin session");
      }
      if (result.data.ended) {
        return;
      }
      await this.sessions.set({ ...storage, value: { ...result.data, ended: true } }, tx);
      await this.audit.write(
        {
          tenantId: storage.tenantId,
          actorUserId: result.data.userId,
          action: "identity.tenant_admin_session.ended",
          targetType: "Tenant",
          targetId: storage.tenantId,
          metadataJson: JSON.stringify({ sessionId: storage.key }),
        },
        tx
      );
    });
  }

  private async authorize(userId: string, tenantId: string) {
    const membership = await this.memberships.findByTenantAndUser(null, userId);
    const allowed =
      membership &&
      (await hasPlatformPermission(
        { userId, tenantId: null, roles: [membership.getRoleId()] },
        "platform.tenants.access",
        { grantRepo: this.grantRepo }
      ));
    if (!allowed) {
      throw new ForbiddenException("Tenant admin session permission required");
    }
    const [user, tenant, role] = await Promise.all([
      this.users.findById(userId),
      this.tenants.findById(tenantId),
      this.roles.findBySystemKey(tenantId, "ADMIN"),
    ]);
    if (!user?.isActive() || !tenant?.isActive() || !role?.isSystem) {
      throw new ForbiddenException("Active user, tenant, and tenant admin role required");
    }
    return { user, tenant, role };
  }

  private parseToken(token: string) {
    const match = /^tenant-admin\.([\w-]{1,256})\.([\w-]{43})$/.exec(token);
    if (!match) {
      throw new UnauthorizedException("Invalid tenant admin session");
    }
    return this.storageKey(Buffer.from(match[1], "base64url").toString("utf8"), match[2]);
  }

  private storageKey(tenantId: string, secret: string) {
    return {
      tenantId,
      moduleId: "identity.tenant-admin-sessions",
      scope: "tenant",
      key: createHash("sha256").update(secret).digest("hex"),
    };
  }
}
