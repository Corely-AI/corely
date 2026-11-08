import {
  Injectable,
  Inject,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  CLOCK_PORT_TOKEN,
  type AuditPort,
  type OutboxPort,
  type ClockPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import { StaffSelfUpdateSchema, StaffPrivateSchema, type StaffSelfView } from "@corely/contracts";
import { StaffDirectoryUseCase } from "./staff-directory.usecase";
import {
  STAFF_REPOSITORY,
  type StaffRepositoryPort,
  type StaffScope,
} from "./ports/staff-repository.port";
import {
  STAFF_AVAILABILITY_REPOSITORY,
  type StaffAvailabilityRepository,
} from "./ports/staff-availability.port";
import {
  STAFF_TASKS,
  STAFF_LIFECYCLE_REPOSITORY,
  type StaffTasksPort,
  type StaffLifecycleRepository,
} from "./ports/staff-lifecycle.port";
import { directoryEntry } from "../domain/staff-rules";
@Injectable()
export class StaffSelfServiceUseCase {
  constructor(
    private readonly directory: StaffDirectoryUseCase,
    @Inject(STAFF_REPOSITORY) private readonly repo: StaffRepositoryPort,
    @Inject(STAFF_AVAILABILITY_REPOSITORY) private readonly schedules: StaffAvailabilityRepository,
    @Inject(STAFF_TASKS) private readonly tasks: StaffTasksPort,
    @Inject(STAFF_LIFECYCLE_REPOSITORY) private readonly lifecycle: StaffLifecycleRepository,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  private async subject(ctx: UseCaseContext, update: boolean, tx?: TransactionContext) {
    const scope = await this.directory.authorize(
      ctx,
      ["people.self.read", ...(update ? ["people.self.update"] : [])],
      tx
    );
    const profile = (await this.repo.list(scope, tx)).find(
      (row) =>
        row.accountId === ctx.userId && !row.archivedAt && row.workspaceId === scope.workspaceId
    );
    if (!profile) {
      throw new ForbiddenException("No active staff profile is linked in this workspace");
    }
    return { scope, profile };
  }
  private async view(
    scope: StaffScope,
    profile: Awaited<ReturnType<StaffSelfServiceUseCase["subject"]>>["profile"],
    ctx: UseCaseContext,
    tx: TransactionContext
  ): Promise<StaffSelfView> {
    const contacts =
      (await this.repo.privateGet(scope, profile.id, tx)) ??
      StaffPrivateSchema.parse({ version: 0 });
    let canEdit = true;
    try {
      await this.directory.authorize(ctx, ["people.self.update"], tx);
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        throw error;
      }
      canEdit = false;
    }
    const record = await this.lifecycle.get(scope, profile.id, tx);
    const checklist = await this.tasks.checklist(ctx, profile.id, record.onboardingTaskId, tx);
    return {
      profile: directoryEntry(profile),
      canEdit,
      contacts: {
        personalEmail: contacts.personalEmail,
        personalPhone: contacts.personalPhone,
        version: contacts.version,
      },
      availability: await this.schedules.get(scope, profile.id, tx),
      onboardingTask: checklist.task,
      tasksAvailable: checklist.available,
    };
  }
  async detail(ctx: UseCaseContext) {
    const initial = await this.subject(ctx, false);
    return this.repo.transaction(initial.scope, async (tx) => {
      const current = await this.subject(ctx, false, tx);
      return this.view(current.scope, current.profile, ctx, tx);
    });
  }
  async save(body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const initial = await this.subject(ctx, true),
      input = StaffSelfUpdateSchema.parse(body);
    if (!key || !/^[\w-]{1,160}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(["self", input]))
      .digest("hex");
    const replayKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    return this.repo.transaction(initial.scope, async (tx) => {
      const { scope, profile } = await this.subject(ctx, true, tx);
      if (input.profileId !== profile.id || initial.profile.id !== profile.id) {
        throw new ConflictException("Staff link changed; reload your profile");
      }
      const replay = await this.repo.replay(scope, replayKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint || replay.staffId !== profile.id) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        return this.view(scope, profile, ctx, tx);
      }
      const contacts =
        (await this.repo.privateGet(scope, profile.id, tx)) ??
        StaffPrivateSchema.parse({ version: 0 });
      if (input.version !== profile.version || input.contactsVersion !== contacts.version) {
        throw new ConflictException("Profile changed; reload before saving");
      }
      const next = {
        ...profile,
        displayName: input.displayName,
        version: profile.version + 1,
        updatedAt: this.clock.now().toISOString(),
      };
      await this.repo.privateSave(
        scope,
        profile.id,
        {
          ...contacts,
          personalEmail: input.personalEmail,
          personalPhone: input.personalPhone,
          version: contacts.version + 1,
        },
        tx
      );
      await this.repo.save(scope, next, tx);
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: "people.staff.self_update",
          entityType: "StaffProfile",
          entityId: profile.id,
          metadata: { workspaceId: scope.workspaceId, version: next.version },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: "people.staff.self_update",
          payload: { workspaceId: scope.workspaceId, staffId: profile.id, version: next.version },
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.repo.saveReplay(scope, replayKey, { fingerprint, staffId: profile.id }, tx);
      return this.view(scope, next, ctx, tx);
    });
  }
}
