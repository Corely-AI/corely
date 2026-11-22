import { createHash, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  UnauthorizedException,
} from "@nestjs/common";
import { type ExtKvPort, EXT_KV_PORT } from "@corely/data";
import { UNIT_OF_WORK, type TransactionContext, type UnitOfWorkPort } from "@corely/kernel";
import {
  CliDayBriefOperation,
  CliTaskAssigneesOperation,
  CliTaskCreateOperation,
  CliGrantSchema,
  CliAgentFingerprintSchema,
  cliAgentProof,
  type CliGrant,
  type CliGrantScope,
  type CliGrantInput,
} from "@corely/contracts";
import { z } from "zod";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import { TenantEntitlementService } from "../../../platform/public";
import { GetEffectivePermissionsUseCase } from "../use-cases/get-effective-permissions.usecase";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../ports/audit.port";
import { CLI_GRANT_LOCK, type CliGrantLock } from "../ports/cli-grant-lock.port";
import { SsoRegistrationService } from "./sso-registration.service";
import { SsoSessionService } from "./sso-session.service";
import { SsoService } from "./sso.service";

const recordSchema = CliGrantSchema.extend({ fingerprint: CliAgentFingerprintSchema });
type GrantRecord = z.infer<typeof recordSchema>;
const workspaceDescribe = {
  id: "workspace.describe",
  description: "Read the name and identifier of the authorized workspace.",
  inputSchema: { type: "object", additionalProperties: false, properties: {} },
} as const;

const operations = [
  workspaceDescribe,
  CliDayBriefOperation,
  CliTaskAssigneesOperation,
  CliTaskCreateOperation,
];

function publicGrant({ fingerprint: _fingerprint, ...grant }: GrantRecord): CliGrant {
  return grant;
}

@Injectable()
export class CliAgentGrantsService {
  constructor(
    private readonly registrations: SsoRegistrationService,
    private readonly browserSignIn: SsoService,
    private readonly sessions: SsoSessionService,
    private readonly workspaces: AuthorizeWorkspaceUseCase,
    @Inject(EXT_KV_PORT) private readonly storage: ExtKvPort,
    @Inject(CLI_GRANT_LOCK) private readonly lock: CliGrantLock,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(GetEffectivePermissionsUseCase)
    private readonly permissions: Pick<GetEffectivePermissionsUseCase, "execute">,
    @Inject(forwardRef(() => TenantEntitlementService))
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">
  ) {}

  async create(userId: string, input: CliGrantInput) {
    this.assertEnabled();
    if (input.operations.some((id) => !operations.some((operation) => operation.id === id))) {
      throw new BadRequestException("Operation is not available for delegation");
    }
    return this.withLock(input, input.agentId, async (tx) => {
      await this.authorizeManager(input, userId, tx);
      const key = this.key(input, input.agentId);
      if (await this.storage.get(key, tx)) {
        throw new ConflictException("Prepare a new agent identity before creating another grant");
      }
      const grant: GrantRecord = {
        ...inputScope(input),
        agentId: input.agentId,
        name: input.name,
        fingerprint: input.fingerprint,
        delegatorId: userId,
        operations: [...new Set(input.operations)],
        expiresAt: new Date(
          this.clock.now().getTime() + input.durationMinutes * 60_000
        ).toISOString(),
        revokedAt: null,
      };
      await this.storage.set({ ...key, value: grant }, tx);
      await this.record(grant, userId, "issued", tx);
      return publicGrant(grant);
    });
  }

  async list(userId: string, scope: CliGrantScope) {
    await this.authorizeManager(scope, userId);
    const { key: _key, ...filter } = this.key(scope, "");
    const rows = await this.storage.list(filter);
    return rows.map(({ value }) => publicGrant(recordSchema.parse(value)));
  }

  async revoke(userId: string, scope: CliGrantScope, agentId: string) {
    return this.withLock(scope, agentId, async (tx) => {
      await this.authorizeManager(scope, userId, tx);
      const key = this.key(scope, agentId);
      const entry = await this.storage.get(key, tx);
      if (!entry) {
        throw new NotFoundException("Agent grant not found");
      }
      const grant = recordSchema.parse(entry.value);
      if (!grant.revokedAt) {
        grant.revokedAt = this.clock.now().toISOString();
        await this.storage.set({ ...key, value: grant }, tx);
        await this.record(grant, userId, "revoked", tx);
      }
      return publicGrant(grant);
    });
  }

  async capabilities(scope: CliGrantScope, credential: { agentId: string; secret: string }) {
    return this.withAuthorizedGrant(scope, credential, async (grant, _workspace, tx) => {
      await this.record(grant, grant.delegatorId, "discovered", tx);
      const granted = operations.filter(({ id }) => grant.operations.includes(id));
      if (
        granted.some(({ id }) => isTaskOperation(id)) &&
        !(await this.canUseTasks(scope, grant.delegatorId, tx))
      ) {
        return granted.filter(({ id }) => !isTaskOperation(id));
      }
      return granted;
    });
  }

  async execute(
    scope: CliGrantScope,
    credential: { agentId: string; secret: string },
    operation: string,
    input: unknown
  ) {
    if (operation !== workspaceDescribe.id) {
      throw new ForbiddenException("Operation not available to this agent");
    }
    if (!z.object({}).strict().safeParse(input).success) {
      throw new BadRequestException("Invalid workspace.describe input");
    }
    return this.useOperation(scope, credential, operation, async ({ workspaceName }) => ({
      ...inputScope(scope),
      name: workspaceName,
    }));
  }

  async useOperation<T>(
    scope: CliGrantScope,
    credential: { agentId: string; secret: string },
    operation: string,
    run: (
      actor: { userId: string; workspaceName: string; agentId: string },
      tx: TransactionContext
    ) => Promise<T>
  ) {
    if (!operations.some(({ id }) => id === operation)) {
      throw new ForbiddenException("Operation not available to this agent");
    }
    return this.withAuthorizedGrant(scope, credential, async (grant, workspace, tx) => {
      if (
        !grant.operations.includes(operation) ||
        (isTaskOperation(operation) && !(await this.canUseTasks(scope, grant.delegatorId, tx)))
      ) {
        throw new ForbiddenException("Operation not granted");
      }
      const result = await run(
        { userId: grant.delegatorId, workspaceName: workspace.name, agentId: grant.agentId },
        tx
      );
      await this.record(grant, grant.delegatorId, "executed", tx, operation);
      return result;
    });
  }

  private async withAuthorizedGrant<T>(
    scope: CliGrantScope,
    credential: { agentId: string; secret: string },
    work: (grant: GrantRecord, workspace: { name: string }, tx: TransactionContext) => Promise<T>
  ) {
    this.assertEnabled();
    return this.withLock(scope, credential.agentId, async (tx) => {
      const value = await this.storage.get(this.key(scope, credential.agentId), tx);
      const parsed = recordSchema.safeParse(value?.value);
      const fingerprint = createHash("sha256")
        .update(cliAgentProof(scope, credential.agentId, credential.secret))
        .digest();
      if (
        !parsed.success ||
        parsed.data.revokedAt ||
        Date.parse(parsed.data.expiresAt) <= this.clock.now().getTime() ||
        parsed.data.tenantId !== scope.tenantId ||
        parsed.data.workspaceId !== scope.workspaceId ||
        parsed.data.agentId !== credential.agentId ||
        !timingSafeEqual(fingerprint, Buffer.from(parsed.data.fingerprint, "hex"))
      ) {
        throw new UnauthorizedException("Agent grant unavailable");
      }
      await this.browserSignIn.requireAccess(parsed.data.delegatorId);
      const workspace = await this.authorizeManager(scope, parsed.data.delegatorId, tx);
      return work(parsed.data, workspace, tx);
    });
  }

  private async authorizeManager(scope: CliGrantScope, userId: string, tx?: TransactionContext) {
    await this.sessions.principal(userId, scope.tenantId);
    return this.workspaces.execute({ ...inputScope(scope), userId, manage: true }, tx);
  }

  private async canUseTasks(scope: CliGrantScope, userId: string, tx: TransactionContext) {
    const { tenantId, workspaceId } = inputScope(scope);
    const { permissions } = await this.permissions.execute({ tenantId, workspaceId, userId }, tx);
    const allowed = ["tasks.read", "tasks.manage"].every(
      (key) =>
        !permissions.denied.includes(key) &&
        (permissions.allowAll || permissions.allowed.includes(key))
    );
    return (
      allowed &&
      (await this.entitlements.isAppEnabled(tenantId, "tasks", tx)) &&
      (await this.entitlements.isAppEnabled(tenantId, "people", tx))
    );
  }

  private assertEnabled() {
    if (!this.registrations.agentGrantsEnabled) {
      throw new NotFoundException();
    }
  }

  private key(scope: CliGrantScope, key: string) {
    return {
      tenantId: scope.tenantId,
      moduleId: "identity-cli-agent-grants",
      scope: JSON.stringify([this.registrations.environment, scope.workspaceId]),
      key,
    };
  }

  private withLock<T>(
    scope: CliGrantScope,
    agentId: string,
    work: (tx: TransactionContext) => Promise<T>
  ) {
    return this.uow.withinTransaction(async (tx) => {
      await this.lock.acquire(JSON.stringify(this.key(scope, agentId)), tx);
      return work(tx);
    });
  }

  private async record(
    grant: CliGrant,
    userId: string,
    outcome: string,
    tx: TransactionContext,
    operation?: string
  ) {
    await this.audit.write(
      {
        tenantId: grant.tenantId,
        actorUserId: userId,
        action: `identity.cli_agent.${outcome}`,
        targetType: "CliAgentGrant",
        targetId: grant.agentId,
        metadataJson: JSON.stringify({
          agentId: grant.agentId,
          delegatorId: grant.delegatorId,
          workspaceId: grant.workspaceId,
          outcome,
          operation,
        }),
      },
      tx
    );
  }
}

function inputScope({ tenantId, workspaceId }: CliGrantScope) {
  return { tenantId, workspaceId };
}

function isTaskOperation(id: string) {
  return id === CliTaskAssigneesOperation.id || id === CliTaskCreateOperation.id;
}
