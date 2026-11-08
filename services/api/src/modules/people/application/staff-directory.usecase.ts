import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  StaffIdentityLinkConflictCode,
  ArchiveStaffSchema,
  CreateStaffSchema,
  ListStaffSchema,
  StaffPrivateSchema,
  UpdateStaffSchema,
  UpdateStaffPrivateSchema,
  type StaffProfile,
  type StaffList,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type UseCaseContext,
  type TransactionContext,
} from "@corely/kernel";
import { TenantEntitlementService } from "../../platform/public";
import { GetEffectivePermissionsUseCase } from "../../identity/public";
import { directoryEntry, staffLinkConflict, validManager } from "../domain/staff-rules";
import {
  STAFF_REPOSITORY,
  STAFF_ACCOUNT_LOOKUP,
  STAFF_PARTY_LOOKUP,
  STAFF_RESOURCE_LOOKUP,
  type StaffRepositoryPort,
  type TransactionalStaffLinkLookup,
  type StaffScope,
} from "./ports/staff-repository.port";

import { STAFF_BOOKING, type StaffBookingPort } from "./ports/staff-availability.port";

type Command = "create" | "update" | "archive" | "private";
@Injectable()
export class StaffDirectoryUseCase {
  constructor(
    @Inject(STAFF_REPOSITORY) private readonly repo: StaffRepositoryPort,
    private readonly permissions: GetEffectivePermissionsUseCase,
    @Inject(STAFF_ACCOUNT_LOOKUP) private readonly accounts: TransactionalStaffLinkLookup,
    @Inject(STAFF_PARTY_LOOKUP) private readonly parties: TransactionalStaffLinkLookup,
    @Inject(STAFF_RESOURCE_LOOKUP) private readonly resources: TransactionalStaffLinkLookup,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(STAFF_BOOKING) private readonly booking: StaffBookingPort
  ) {}
  async authorize(
    ctx: UseCaseContext,
    required: string[],
    tx?: TransactionContext
  ): Promise<StaffScope> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);
    if (
      required.some(
        (key) =>
          permissions.denied.includes(key) ||
          (!permissions.allowAll && !permissions.allowed.includes(key))
      )
    ) {
      throw new ForbiddenException("People access denied");
    }
    if (!(await this.entitlements.isAppEnabled(ctx.tenantId, "people", tx))) {
      throw new ForbiddenException("People app is disabled");
    }
    return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  }
  private async profile(scope: StaffScope, id: string, tx?: TransactionContext) {
    const profile = await this.repo.get(scope, id, tx);
    if (!profile || profile.workspaceId !== scope.workspaceId) {
      throw new NotFoundException("Staff profile not found");
    }
    return profile;
  }
  async list(query: unknown, ctx: UseCaseContext): Promise<StaffList> {
    const scope = await this.authorize(ctx, ["people.directory.read"]);
    const input = ListStaffSchema.parse(query);
    const q = input.q.toLocaleLowerCase();
    const profiles = (await this.repo.list(scope))
      .filter(
        (p) =>
          p.workspaceId === scope.workspaceId &&
          (input.archived === "all" || Boolean(p.archivedAt) === (input.archived === "archived")) &&
          [p.displayName, p.jobTitle, p.team, p.location].some((value) =>
            value?.toLocaleLowerCase().includes(q)
          )
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
    return {
      items: profiles
        .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
        .map(directoryEntry),
      total: profiles.length,
      page: input.page,
      pageSize: input.pageSize,
    };
  }
  async detail(id: string, ctx: UseCaseContext) {
    const scope = await this.authorize(ctx, ["people.directory.read"]);
    return directoryEntry(await this.profile(scope, id));
  }
  async managementDetail(id: string, ctx: UseCaseContext, tx?: TransactionContext) {
    const scope = await this.authorize(ctx, ["people.directory.read", "people.profile.manage"], tx);
    return this.profile(scope, id, tx);
  }
  async privateDetail(id: string, ctx: UseCaseContext) {
    const scope = await this.authorize(ctx, ["people.directory.read", "people.private.read"]);
    await this.profile(scope, id);
    return (await this.repo.privateGet(scope, id)) ?? StaffPrivateSchema.parse({ version: 0 });
  }
  async command(
    kind: Command,
    id: string | null,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext,
    transaction?: TransactionContext
  ) {
    const required = [
      "people.directory.read",
      "people.profile.manage",
      ...(kind === "private" ? ["people.private.manage"] : []),
    ];
    const scope = await this.authorize(ctx, required, transaction);
    if (!key || key.length > 160 || !/^[\w-]+$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const input =
      kind === "create"
        ? CreateStaffSchema.parse(body)
        : kind === "update"
          ? UpdateStaffSchema.parse(body)
          : kind === "private"
            ? UpdateStaffPrivateSchema.parse(body)
            : ArchiveStaffSchema.parse(body);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([kind, id, input]))
      .digest("hex");
    const commandKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    const work = async (tx: TransactionContext) => {
      if (transaction) {
        await this.repo.lock(scope, tx);
      }
      // Recheck current authority after acquiring the write lock, including retries.
      await this.authorize(ctx, required, tx);
      const replay = await this.repo.replay(scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        // Store IDs only: replay cannot return an old privileged/private projection.
        return directoryEntry(await this.profile(scope, replay.staffId, tx));
      }
      const now = new Date().toISOString();
      const previous = id ? await this.profile(scope, id, tx) : null;
      if (kind !== "create" && !previous) {
        throw new NotFoundException("Staff profile not found");
      }
      if (previous?.archivedAt && kind !== "archive") {
        throw new ConflictException("Archived staff cannot be changed");
      }
      let next: StaffProfile;
      const fields =
        kind === "update"
          ? (() => {
              const parsed = UpdateStaffSchema.parse(input);
              const fields = CreateStaffSchema.parse(
                Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== "version"))
              );
              return fields;
            })()
          : kind === "create"
            ? CreateStaffSchema.parse(input)
            : null;
      if (kind === "private") {
        if (!previous) {
          throw new NotFoundException("Staff profile not found");
        }
        const value = UpdateStaffPrivateSchema.parse(input);
        const current = await this.repo.privateGet(scope, previous.id, tx);
        if (value.version !== (current?.version ?? 0)) {
          throw new ConflictException("Private details changed; reload before saving");
        }
        await this.repo.privateSave(
          scope,
          previous.id,
          { ...value, version: value.version + 1 },
          tx
        );
        next = { ...previous, version: previous.version + 1, updatedAt: now };
      } else {
        if (previous && "version" in input && input.version !== previous.version) {
          throw new ConflictException("Staff profile changed; reload before saving");
        }
        next =
          kind === "archive" && previous
            ? {
                ...previous,
                version: previous.version + 1,
                archivedAt: previous.archivedAt ?? now,
                updatedAt: now,
              }
            : {
                ...CreateStaffSchema.parse(fields),
                id: previous?.id ?? randomUUID(),
                workspaceId: scope.workspaceId,
                version: (previous?.version ?? 0) + 1,
                archivedAt: null,
                createdAt: previous?.createdAt ?? now,
                updatedAt: now,
              };
        if (kind !== "archive") {
          const profiles = await this.repo.list(scope, tx);
          if (staffLinkConflict(next, profiles)) {
            throw new ConflictException({
              code: StaffIdentityLinkConflictCode,
              message: "Identity link is already assigned to another staff profile",
            });
          }
          if (!validManager(next, profiles)) {
            throw new BadRequestException(
              "Manager must be active in this workspace and cannot create a reporting cycle"
            );
          }
          for (const [target, lookup] of [
            [next.accountId, this.accounts],
            [next.partyId, this.parties],
            [next.resourceId, this.resources],
          ] as const) {
            if (target && !(await lookup.exists(scope, target, tx))) {
              throw new BadRequestException("Linked record is unavailable in this workspace");
            }
          }
        }
      }
      // Link/archive changes serialize with bookings just like pattern changes.
      await this.booking.lock(
        scope,
        [previous?.resourceId, next.resourceId].filter((id): id is string => Boolean(id)),
        tx
      );
      await this.repo.save(scope, next, tx);
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: `people.staff.${kind}`,
          entityType: "StaffProfile",
          entityId: next.id,
          metadata: { workspaceId: scope.workspaceId, version: next.version },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: `people.staff.${kind}`,
          payload: { workspaceId: scope.workspaceId, staffId: next.id, version: next.version },
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.repo.saveReplay(scope, commandKey, { fingerprint, staffId: next.id }, tx);
      return directoryEntry(next);
    };
    return transaction ? work(transaction) : this.repo.transaction(scope, work);
  }
}
