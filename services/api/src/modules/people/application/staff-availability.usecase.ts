import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  SaveStaffAvailabilitySchema,
  type StaffAvailability,
  type StaffAvailabilityView,
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
import {
  STAFF_AVAILABILITY_REPOSITORY,
  STAFF_BOOKING,
  type StaffAvailabilityRepository,
  type StaffBookingPort,
} from "./ports/staff-availability.port";
import { staffCovers, staffDateStart, staffLocalDate } from "../domain/staff-availability";

@Injectable()
export class StaffAvailabilityUseCase {
  constructor(
    private readonly directory: StaffDirectoryUseCase,
    @Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort,
    @Inject(STAFF_AVAILABILITY_REPOSITORY) private readonly schedules: StaffAvailabilityRepository,
    @Inject(STAFF_BOOKING) private readonly booking: StaffBookingPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  private async scope(id: string, ctx: UseCaseContext): Promise<StaffScope> {
    await this.directory.managementDetail(id, ctx);
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  }
  private async profile(scope: StaffScope, id: string, tx: TransactionContext) {
    const profile = await this.staff.get(scope, id, tx);
    if (!profile) {
      throw new NotFoundException("Staff profile not found");
    }
    return profile;
  }
  private async view(
    scope: StaffScope,
    profile: StaffProfile,
    schedule: StaffAvailability,
    tx?: TransactionContext
  ): Promise<StaffAvailabilityView> {
    const now = this.clock.now();
    const commitments = profile.resourceId
      ? await this.booking.commitments(scope, profile.resourceId, now, tx)
      : [];
    return {
      ...schedule,
      profileVersion: profile.version,
      resourceId: profile.resourceId,
      evaluatedAt: now.toISOString(),
      affectedCommitments: commitments.filter((c) => {
        // Preparation may already be underway for an upcoming appointment.
        // Check its remaining occupancy without re-evaluating elapsed history.
        const remainingStart = new Date(Math.max(now.getTime(), Date.parse(c.startAt)));
        return profile.archivedAt || !staffCovers(schedule, remainingStart, new Date(c.endAt));
      }),
    };
  }
  async detail(id: string, ctx: UseCaseContext) {
    // Manager-only raw patterns and impact IDs. Operational consumers receive windows only.
    const scope = await this.scope(id, ctx);
    return this.staff.transaction(scope, async (tx) => {
      await this.directory.managementDetail(id, ctx);
      const profile = await this.profile(scope, id, tx);
      if (profile.resourceId) {
        await this.booking.lock(scope, [profile.resourceId], tx);
      }
      return this.view(scope, profile, await this.schedules.get(scope, id, tx), tx);
    });
  }
  async save(id: string, body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const scope = await this.scope(id, ctx);
    const input = SaveStaffAvailabilitySchema.parse(body);
    if (!key || !/^[\w-]{1,160}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(["availability", id, input]))
      .digest("hex");
    const commandKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    return this.staff.transaction(scope, async (tx) => {
      await this.directory.managementDetail(id, ctx);
      const profile = await this.profile(scope, id, tx);
      if (profile.resourceId) {
        await this.booking.lock(scope, [profile.resourceId], tx);
      }
      const current = await this.schedules.get(scope, id, tx);
      const replay = await this.staff.replay(scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used");
        }
        return this.view(scope, profile, current, tx);
      }
      if (
        profile.archivedAt ||
        profile.version !== input.profileVersion ||
        current.version !== input.version
      ) {
        throw new ConflictException("Staff or availability changed; reload before saving");
      }
      const now = this.clock.now();
      if (input.pattern.effectiveFrom < staffLocalDate(now, input.pattern.timezone)) {
        throw new BadRequestException("Past working patterns cannot be rewritten");
      }
      let startsAt: string, endsAt: string | null;
      try {
        startsAt = staffDateStart(input.pattern.effectiveFrom, input.pattern.timezone);
        endsAt = input.pattern.effectiveUntil
          ? staffDateStart(input.pattern.effectiveUntil, input.pattern.timezone)
          : null;
      } catch {
        throw new BadRequestException("Effective date does not exist in this timezone");
      }
      // Today's changes begin at the next real minute; earlier history stays intact.
      if (Date.parse(startsAt) < now.getTime()) {
        startsAt = new Date(Math.ceil(now.getTime() / 60000) * 60000).toISOString();
      }
      if (endsAt && endsAt <= startsAt) {
        throw new BadRequestException("Effective range has ended");
      }
      const next: StaffAvailability = {
        version: current.version + 1,
        plans: [
          ...current.plans.filter(
            (p) =>
              p.startsAt !== startsAt &&
              (p.pattern.effectiveFrom !== input.pattern.effectiveFrom ||
                Date.parse(p.startsAt) < now.getTime())
          ),
          { revision: current.version + 1, startsAt, endsAt, pattern: input.pattern },
        ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
      if (next.plans.length > 256) {
        throw new BadRequestException("Pattern history limit reached");
      }
      const result = await this.view(scope, profile, next, tx);
      await this.schedules.save(scope, id, next, tx);
      const metadata = {
        workspaceId: scope.workspaceId,
        staffId: id,
        version: next.version,
        affectedCommitments: result.affectedCommitments.map((c) => ({ id: c.id, kind: c.kind })),
      };
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: "people.availability.changed",
          entityType: "StaffProfile",
          entityId: id,
          metadata,
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: "people.availability.changed",
          payload: metadata,
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.staff.saveReplay(scope, commandKey, { fingerprint, staffId: id }, tx);
      return result;
    });
  }
}
