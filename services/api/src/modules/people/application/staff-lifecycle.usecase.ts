import { Injectable, Inject, BadRequestException, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  ApproveStaffOnboardingSchema,
  OffboardStaffSchema,
  type StaffLifecycleView,
  type StaffProfile,
} from "@corely/contracts";
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
import { StaffDirectoryUseCase } from "./staff-directory.usecase";
import {
  STAFF_REPOSITORY,
  type StaffRepositoryPort,
  type StaffScope,
} from "./ports/staff-repository.port";
import { STAFF_BOOKING, type StaffBookingPort } from "./ports/staff-availability.port";
import {
  STAFF_TASKS,
  STAFF_WORKSPACE_ACCESS,
  STAFF_LIFECYCLE_REPOSITORY,
  type StaffTasksPort,
  type StaffWorkspaceAccessPort,
  type StaffLifecycleRepository,
} from "./ports/staff-lifecycle.port";
import { directoryEntry } from "../domain/staff-rules";
@Injectable()
export class StaffLifecycleUseCase {
  constructor(
    private readonly directory: StaffDirectoryUseCase,
    @Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort,
    @Inject(STAFF_TASKS) private readonly tasks: StaffTasksPort,
    @Inject(STAFF_WORKSPACE_ACCESS) private readonly access: StaffWorkspaceAccessPort,
    @Inject(STAFF_LIFECYCLE_REPOSITORY) private readonly repo: StaffLifecycleRepository,
    @Inject(STAFF_BOOKING) private readonly booking: StaffBookingPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  private async view(
    scope: StaffScope,
    profile: StaffProfile,
    ctx: UseCaseContext,
    tx: TransactionContext
  ): Promise<StaffLifecycleView> {
    const record = await this.repo.get(scope, profile.id, tx);
    const checklist = await this.tasks.checklist(ctx, profile.id, record.onboardingTaskId, tx);
    return {
      profile: directoryEntry(profile),
      onboardingTask: checklist.task,
      tasks: await this.tasks.followup(ctx, profile.id, tx),
      bookings: profile.resourceId
        ? await this.booking.commitments(scope, profile.resourceId, this.clock.now(), tx)
        : [],
      access: await this.access.inspect(scope, ctx.userId ?? "", profile.accountId, tx),
    };
  }
  async detail(id: string, ctx: UseCaseContext) {
    const scope = await this.directory.authorize(ctx, [
      "people.directory.read",
      "people.profile.manage",
    ]);
    return this.tasks.transaction(scope, async (tx) => {
      await this.staff.lock(scope, tx);
      const profile = await this.directory.managementDetail(id, ctx, tx);
      if (profile.resourceId) {
        await this.booking.lock(scope, [profile.resourceId], tx);
      }
      return this.view(scope, profile, ctx, tx);
    });
  }
  async command(
    kind: "onboarding" | "offboard",
    id: string,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const scope = await this.directory.authorize(ctx, [
      "people.directory.read",
      "people.profile.manage",
    ]);
    if (!key || !/^[\w-]{1,160}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const input =
      kind === "onboarding"
        ? ApproveStaffOnboardingSchema.parse(body)
        : OffboardStaffSchema.parse(body);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([kind, id, input]))
      .digest("hex");
    const replayKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    return this.tasks.transaction(scope, async (tx) => {
      await this.staff.lock(scope, tx);
      let profile = await this.directory.managementDetail(id, ctx, tx);
      const replay = await this.repo.replay(scope, replayKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint || replay.staffId !== id) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        // Revalidate the sensitive workspace operation even after an uncertain reply.
        if (kind === "offboard" && OffboardStaffSchema.parse(input).disableWorkspaceAccess) {
          await this.access.assertCanDisable(scope, profile.accountId, ctx, tx);
        }
        return this.view(scope, profile, ctx, tx);
      }
      if (profile.version !== input.version) {
        throw new ConflictException("Staff profile changed; reload before continuing");
      }
      if (kind === "onboarding") {
        if (profile.archivedAt) {
          throw new ConflictException("Archived staff cannot be onboarded");
        }
        const previous = await this.repo.get(scope, id, tx);
        if (previous.onboardingTaskId) {
          throw new ConflictException("An approved onboarding checklist is already assigned");
        }
        const task = await this.tasks.approve(ctx, id, input, tx);
        await this.repo.save(
          scope,
          id,
          { onboardingTaskId: task.id, approvedAt: this.clock.now().toISOString() },
          tx
        );
      } else {
        const fields = OffboardStaffSchema.parse(input);
        if (profile.archivedAt && !fields.disableWorkspaceAccess) {
          throw new ConflictException("Staff profile is already archived");
        }
        if (!profile.archivedAt) {
          await this.directory.command(
            "archive",
            id,
            { version: profile.version },
            createHash("sha256").update(`archive:${replayKey}`).digest("hex"),
            ctx,
            tx
          );
          profile = await this.directory.managementDetail(id, ctx, tx);
        }
        if (fields.disableWorkspaceAccess) {
          await this.access.disable(scope, profile.accountId, ctx, tx);
        }
      }
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: `people.staff.${kind}`,
          entityType: "StaffProfile",
          entityId: id,
          metadata: { workspaceId: scope.workspaceId, version: profile.version },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: `people.staff.${kind}`,
          payload: { workspaceId: scope.workspaceId, staffId: id, version: profile.version },
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.repo.saveReplay(scope, replayKey, { fingerprint, staffId: id }, tx);
      return this.view(scope, profile, ctx, tx);
    });
  }
}
