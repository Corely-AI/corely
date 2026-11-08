import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SSO_STORE, type SsoStorePort } from "../ports/sso-store.port";
import { SSO_CRYPTO, type SsoCryptoPort } from "../ports/sso-crypto.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import { AuthorizeRequestContextUseCase } from "../use-cases/authorize-request-context.usecase";
import { SsoRegistrationService } from "./sso-registration.service";
import { SSO_IDLE_MS } from "./sso.service";

@Injectable()
export class SsoSessionService {
  constructor(
    private readonly registrations: SsoRegistrationService,
    @Inject(SSO_STORE) private readonly store: SsoStorePort,
    @Inject(SSO_CRYPTO) private readonly crypto: SsoCryptoPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly memberships: MembershipRepositoryPort,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenants: TenantRepositoryPort,
    private readonly authorize: AuthorizeRequestContextUseCase,
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: UserRepositoryPort
  ) {}
  async authenticate(
    origin: string,
    handle: string | undefined,
    csrfToken?: string,
    rotate = false
  ) {
    const app = this.registrations.app(origin);
    if (!handle || (rotate && csrfToken === undefined)) {
      throw new UnauthorizedException("Session expired; sign in again");
    }
    const binding = `${this.registrations.environment}:${origin}:session`;
    if (
      csrfToken !== undefined &&
      !this.crypto.equal(csrfToken, this.crypto.csrf(handle, binding))
    ) {
      throw new UnauthorizedException("Invalid session CSRF token");
    }
    const replacement = rotate ? this.crypto.secret() : undefined;
    const now = this.clock.now();
    const session = await this.store.useSession({
      handleHash: this.crypto.hash(handle),
      environment: this.registrations.environment,
      appKey: app.key,
      now,
      idleExpiresAt: new Date(now.getTime() + SSO_IDLE_MS),
      ...(replacement ? { replacementHash: this.crypto.hash(replacement) } : {}),
    });
    return {
      userId: session.userId,
      handle: replacement,
      csrfToken: this.crypto.csrf(replacement ?? handle, binding),
      expiresAt: session.expiresAt.toISOString(),
      maxAge: Math.max(0, session.expiresAt.getTime() - now.getTime()),
    };
  }
  async profile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user?.isActive()) {
      throw new UnauthorizedException("Account unavailable");
    }
    const memberships: Array<{ tenantId: string; tenantName: string; roleId: string }> = [];
    for (const member of await this.memberships.findByUserId(userId)) {
      const tenantId = member.getTenantId();
      if (!tenantId) {
        continue;
      }
      const tenant = await this.tenants.findById(tenantId);
      if (tenant?.isActive()) {
        memberships.push({ tenantId, tenantName: tenant.getName(), roleId: member.getRoleId() });
      }
    }
    if (!memberships.length) {
      throw new ForbiddenException("Team access unavailable");
    }
    return { userId, email: user.getEmail().getValue(), name: user.getName(), memberships };
  }
  async principal(userId: string, tenantHint?: string, workspaceHint?: string) {
    let tenantId = tenantHint;
    if (!tenantId) {
      const candidates = new Set<string>();
      for (const member of await this.memberships.findByUserId(userId)) {
        const id = member.getTenantId();
        if (id && (await this.tenants.findById(id))?.isActive()) {
          candidates.add(id);
        }
      }
      if (candidates.size !== 1) {
        throw new BadRequestException("Select a team with x-tenant-id");
      }
      tenantId = [...candidates][0];
    }
    if (!(await this.tenants.findById(tenantId))?.isActive()) {
      throw new ForbiddenException("Team access unavailable");
    }
    const { roleIds } = await this.authorize.execute({
      userId,
      tenantId,
      workspaceId: workspaceHint,
    });
    return { userId, tenantId, workspaceId: workspaceHint, roleIds };
  }
}
