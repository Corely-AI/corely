import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  CLOCK_PORT_TOKEN,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
  type UseCaseContext,
  type TransactionContext,
  type ClockPort,
} from "@corely/kernel";
import {
  OpenBukPublicStudioSchema,
  OpenBukSetupSchema,
  OpenBukSetupDraftSchema,
  OpenBukTeamUpdateSchema,
  type OpenBukSetupDraft,
  type OpenBukSetup,
  type OpenBukBook,
  type OpenBukPublicBookResponse,
  type OpenBukAgendaQuery,
  type OpenBukManagerBook,
  type OpenBukReceipt,
  type OpenBukTeamUpdate,
} from "@corely/contracts";
import { StaffAvailabilityConstraintService } from "../../../people/public";
import { createHash, randomBytes } from "node:crypto";
import { AuthorizeWorkspaceUseCase, PilotSetupUseCase } from "../../../workspaces/public";
import {
  OPENBUK_REPOSITORY,
  type OpenBukRepositoryPort,
  type StudioScope,
  type OpenBukSelection,
} from "../ports/openbuk-repository.port";
import { openBukAvailability, studioDate } from "../../domain/openbuk-availability";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";
import { OpenBukGuestCredentials } from "./openbuk-guest-credentials";

import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { BOOKING_POLICIES, enforceBookingPolicy } from "../booking-policy";

@Injectable()
export class OpenBukStudioUseCase {
  constructor(
    @Inject(OPENBUK_REPOSITORY) private readonly repo: OpenBukRepositoryPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AuthorizeWorkspaceUseCase)
    private readonly authorize: Pick<AuthorizeWorkspaceUseCase, "execute">,
    @Inject(PilotSetupUseCase)
    private readonly pilot: Pick<PilotSetupUseCase, "publish" | "requirePublicBooking">,
    @Inject(StaffAvailabilityConstraintService)
    private readonly staffAvailability: Pick<StaffAvailabilityConstraintService, "windows">,
    @Inject(BOOKING_POLICIES)
    private readonly policies: readonly BookingPolicyRegistration[] = [],
    @Optional() private readonly guestCredentials?: OpenBukGuestCredentials
  ) {}

  private scope(ctx: UseCaseContext): StudioScope {
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new BadRequestException("Select a studio workspace");
    }
    return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  }
  private async admin(ctx: UseCaseContext, manage = false, tx?: TransactionContext) {
    const scope = this.scope(ctx);
    if (!ctx.userId) {
      throw new BadRequestException("Authentication required");
    }
    const workspace = await this.authorize.execute({ ...scope, userId: ctx.userId, manage }, tx);
    return { scope, workspace, userId: ctx.userId };
  }
  private publicScope(ctx: UseCaseContext) {
    const error = assertPublicModuleEnabled(ctx, "booking");
    if (error) {
      throw toHttpException(error);
    }
    return this.scope(ctx);
  }
  async getStudio(ctx: UseCaseContext) {
    const { scope, workspace } = await this.admin(ctx);
    return {
      studio: await this.repo.studioSettings(scope),
      canManage: workspace.canManage === true,
    };
  }
  async getTeam(ctx: UseCaseContext) {
    const { scope } = await this.admin(ctx, true);
    return { team: await this.repo.team(scope, this.clock.now()) };
  }
  async saveTeam(input: OpenBukTeamUpdate, ctx: UseCaseContext) {
    const { scope, userId } = await this.admin(ctx, true);
    const update = OpenBukTeamUpdateSchema.parse(input);
    const fingerprint = createHash("sha256").update(JSON.stringify(update)).digest("hex");
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      await this.admin(ctx, true, tx);
      const { team, changed } = await this.repo.saveTeam(
        scope,
        update,
        fingerprint,
        this.clock.now(),
        tx
      );
      if (changed) {
        await this.audit.log(
          {
            tenantId: scope.tenantId,
            userId,
            action: "openbuk.team.configured",
            entityType: "Workspace",
            entityId: scope.workspaceId,
            metadata: { revision: team.revision },
          },
          tx
        );
        await this.outbox.enqueue(
          {
            tenantId: scope.tenantId,
            eventType: "booking.openbuk-team.configured",
            payload: { workspaceId: scope.workspaceId, revision: team.revision },
          },
          tx
        );
      }
      return { team };
    });
  }
  async getSetup(ctx: UseCaseContext) {
    const { scope } = await this.admin(ctx, true);
    return { draft: await this.repo.draft(scope) };
  }
  async saveSetup(input: OpenBukSetupDraft, ctx: UseCaseContext) {
    const { scope } = await this.admin(ctx, true);
    const draft = OpenBukSetupDraftSchema.parse(input);
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      await this.admin(ctx, true, tx);
      await this.repo.saveDraft(scope, draft, tx);
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId!,
          action: "openbuk.setup.saved",
          entityType: "Workspace",
          entityId: scope.workspaceId,
        },
        tx
      );
      return { draft };
    });
  }
  async publishSetup(input: OpenBukSetup, ctx: UseCaseContext) {
    return this.configure(input, ctx, true);
  }
  async configure(input: OpenBukSetup, ctx: UseCaseContext, publish = false) {
    input = OpenBukSetupSchema.parse(input);
    const { scope, workspace } = await this.admin(ctx, true);
    if (!workspace.slug) {
      throw new BadRequestException("Studio needs a public workspace slug");
    }
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      await this.admin(ctx, true, tx);
      const studio = await this.repo.configure(scope, input, workspace.slug!, tx);
      await this.repo.saveDraft(scope, input, tx);
      if (publish) {
        await this.pilot.publish(ctx, tx);
      }
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId!,
          action: "openbuk.studio.configured",
          entityType: "Workspace",
          entityId: scope.workspaceId,
          metadata: { workspaceId: scope.workspaceId },
        },
        tx
      );
      return { studio };
    });
  }
  async assertLegacyPublicBookingAllowed(
    ctx: UseCaseContext,
    tx?: TransactionContext
  ): Promise<void> {
    const scope = this.publicScope(ctx);
    if (tx) {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      await this.pilot.requirePublicBooking(scope.tenantId, scope.workspaceId, tx);
    }
    // Registration remains authoritative even when a service is disabled.
    if (await this.repo.isRegistered(scope, tx)) {
      throw new NotFoundException("Use the OpenBuk booking page");
    }
  }
  async publicStudio(ctx: UseCaseContext) {
    const catalog = await this.repo.publicCatalog(this.publicScope(ctx));
    if (!catalog) {
      throw new NotFoundException({
        code: "Booking:ServiceUnavailable",
        message: "Booking:ServiceUnavailable",
      });
    }
    return {
      studio: OpenBukPublicStudioSchema.parse({ ...catalog.studio, services: catalog.services }),
    };
  }
  private async slots(
    scope: StudioScope,
    day: string,
    selection?: OpenBukSelection,
    tx?: TransactionContext,
    excludeBookingId?: string
  ) {
    const studio = await this.repo.studio(scope, tx, selection);
    if (!studio) {
      throw new NotFoundException({
        code: "Booking:ServiceUnavailable",
        message: "Booking:ServiceUnavailable",
      });
    }
    const midnight = Date.parse(`${day}T00:00:00Z`);
    const now = this.clock.now();
    const busy = await this.repo.occupied(
      scope,
      studio.staffId,
      new Date(midnight - 14 * 3600000),
      new Date(midnight + 38 * 3600000),
      now,
      tx,
      excludeBookingId
    );
    const staffWindows = await this.staffAvailability.windows(
      scope,
      studio.staffId,
      new Date(midnight - 14 * 3600000),
      new Date(midnight + 38 * 3600000),
      tx
    );
    return { studio, slots: openBukAvailability(studio, day, now, busy, staffWindows) };
  }
  async replacementSlot(
    scope: StudioScope,
    timezone: string,
    bookingId: string,
    startAt: Date,
    tx?: TransactionContext,
    selection?: OpenBukSelection
  ) {
    const { slots } = await this.slots(
      scope,
      studioDate(startAt, timezone),
      selection,
      tx,
      bookingId
    );
    const slot = slots.find((candidate) => candidate.startAt === startAt.toISOString());
    if (!slot) {
      throw new ConflictException("Booking:SlotUnavailable");
    }
    return slot;
  }
  async appointmentSlots(
    scope: StudioScope,
    day: string,
    selection: OpenBukSelection,
    bookingId: string
  ) {
    return this.slots(scope, day, selection, undefined, bookingId);
  }
  async availability(day: string, ctx: UseCaseContext, selection?: OpenBukSelection) {
    const result = await this.slots(this.publicScope(ctx), day, selection);
    return { slots: result.slots, timezone: result.studio.timezone };
  }
  async book(input: OpenBukBook, key: string, ctx: UseCaseContext) {
    return this.commitBooking(input, key, this.publicScope(ctx));
  }

  async bookForStudio(input: OpenBukManagerBook, key: string, ctx: UseCaseContext) {
    const { scope } = await this.admin(ctx, true);
    return this.commitBooking(input, key, scope, ctx);
  }

  private async commitBooking(
    input: OpenBukManagerBook,
    key: string,
    scope: StudioScope,
    manager?: UseCaseContext
  ): Promise<OpenBukPublicBookResponse> {
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const receiptKey = manager ? `manager:${key}` : key;
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      if (!manager) {
        await this.pilot.requirePublicBooking(scope.tenantId, scope.workspaceId, tx);
      }
      const userId = manager ? (await this.admin(manager, true, tx)).userId : undefined;
      const saved = await this.repo.receipt(scope, receiptKey, tx);
      if (saved) {
        if (saved.fingerprint !== fingerprint) {
          throw new ConflictException({
            code: "Booking:IdempotencyMismatch",
            message: "Booking:IdempotencyMismatch",
          });
        }
        const management =
          saved.guestBookingId && !manager
            ? await this.guestCredentials?.replay(scope, saved.guestBookingId, this.clock.now(), tx)
            : undefined;
        return { receipt: saved.receipt, management };
      }
      const initial = await this.repo.studio(scope, tx, input);
      if (!initial) {
        throw new NotFoundException({
          code: "Booking:ServiceUnavailable",
          message: "Booking:ServiceUnavailable",
        });
      }
      await this.repo.lock(scope, initial.staffId, tx);
      const { studio, slots } = await this.slots(
        scope,
        studioDate(new Date(input.startAt), initial.timezone),
        input,
        tx
      );
      const slot = slots.find((s) => s.startAt === new Date(input.startAt).toISOString());
      if (!slot) {
        throw new ConflictException({
          code: "Booking:SlotUnavailable",
          message: "Booking:SlotUnavailable",
        });
      }
      enforceBookingPolicy(
        this.policies,
        scope,
        new Date(slot.startAt),
        new Date(slot.endAt),
        this.clock.now()
      );
      const receipt: OpenBukReceipt = {
        ...slot,
        reference: `OB-${randomBytes(6).toString("hex").toUpperCase()}`,
        serviceName: studio.serviceName,
        staffName: studio.staffName,
        priceCents: studio.priceCents,
        currency: studio.currency,
        timezone: studio.timezone,
      };
      const bookingId = await this.repo.create(scope, studio, input, receipt, tx, userId);
      const management = !manager
        ? await this.guestCredentials?.issue(
            scope,
            bookingId,
            receipt.startAt,
            this.clock.now(),
            tx
          )
        : undefined;
      await this.repo.saveReceipt(
        scope,
        receiptKey,
        {
          fingerprint,
          receipt,
          ...(management ? { guestBookingId: bookingId } : {}),
        },
        tx
      );
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: userId ?? "public",
          action: "booking.created",
          entityType: "Booking",
          entityId: bookingId,
          metadata: { workspaceId: scope.workspaceId, source: "openbuk" },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: "booking.created",
          payload: {
            bookingId,
            workspaceId: scope.workspaceId,
            status: "CONFIRMED",
            source: "openbuk",
          },
        },
        tx
      );
      return { receipt, management };
    });
  }
  async appointments(day: string, ctx: UseCaseContext) {
    // Customer contact snapshots are operational data; initial roles are owner/admin.
    const { scope } = await this.admin(ctx, true);
    return { appointments: await this.repo.appointments(scope, day) };
  }

  async agenda(query: OpenBukAgendaQuery, ctx: UseCaseContext) {
    const { scope } = await this.admin(ctx, true);
    const [settings, catalog] = await Promise.all([
      this.repo.studioSettings(scope),
      this.repo.publicCatalog(scope),
    ]);
    if (!settings) {
      throw new NotFoundException("Studio not found");
    }
    const services = catalog?.services ?? (catalog ? [this.defaultService(catalog.studio)] : []);
    const service = services.find(({ serviceId }) => serviceId === query.serviceId) ?? services[0];
    const staff =
      service?.staff.find(({ staffId }) => staffId === query.staffId) ?? service?.staff[0];
    const selection =
      service && staff ? { serviceId: service.serviceId, staffId: staff.staffId } : null;
    const start = Date.parse(`${query.day}T00:00:00Z`);
    const days = await Promise.all(
      Array.from({ length: query.span === "week" ? 7 : 1 }, (_, offset) => {
        const day = new Date(start + offset * 86_400_000).toISOString().slice(0, 10);
        return this.agendaDay(scope, day, selection);
      })
    );
    return { timezone: settings.timezone, services, selection, days };
  }

  private defaultService(
    studio: NonNullable<Awaited<ReturnType<OpenBukRepositoryPort["studio"]>>>
  ) {
    const {
      serviceId,
      serviceName,
      durationMinutes,
      priceCents,
      currency,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      staffId,
      staffName,
      timezone,
    } = studio;
    return {
      serviceId,
      serviceName,
      durationMinutes,
      priceCents,
      currency,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      staff: [{ staffId, staffName, timezone }],
    };
  }

  private async agendaDay(scope: StudioScope, day: string, selection: OpenBukSelection | null) {
    const appointments = await this.repo.appointments(scope, day);
    if (!selection) {
      return { day, appointments, slots: [] };
    }
    try {
      return { day, appointments, slots: (await this.slots(scope, day, selection)).slots };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { day, appointments, slots: [] };
      }
      throw error;
    }
  }
}
