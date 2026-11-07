import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
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
  type OpenBukSetupDraft,
  type OpenBukSetup,
  type OpenBukBook,
  type OpenBukReceipt,
} from "@corely/contracts";
import { createHash, randomBytes } from "node:crypto";
import { AuthorizeWorkspaceUseCase, PilotSetupUseCase } from "../../../workspaces/public";
import {
  OPENBUK_REPOSITORY,
  type OpenBukRepositoryPort,
  type StudioScope,
} from "../ports/openbuk-repository.port";
import { openBukAvailability, studioDate } from "../../domain/openbuk-availability";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";

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
    @Inject(PilotSetupUseCase) private readonly pilot: Pick<PilotSetupUseCase, "publish">
  ) {}

  private scope(ctx: UseCaseContext): StudioScope {
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new BadRequestException("Select a studio workspace");
    }
    return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  }
  private async admin(ctx: UseCaseContext, manage = false) {
    const scope = this.scope(ctx);
    if (!ctx.userId) {
      throw new BadRequestException("Authentication required");
    }
    const workspace = await this.authorize.execute({ ...scope, userId: ctx.userId, manage });
    return { scope, workspace };
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
    return { studio: await this.repo.studio(scope), canManage: workspace.canManage === true };
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
      await this.admin(ctx, true);
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
      await this.admin(ctx, true);
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
  async assertLegacyPublicBookingAllowed(ctx: UseCaseContext): Promise<void> {
    // Registration remains authoritative even when a service is disabled.
    if (await this.repo.isRegistered(this.publicScope(ctx))) {
      throw new NotFoundException("Use the OpenBuk booking page");
    }
  }
  async publicStudio(ctx: UseCaseContext) {
    const studio = await this.repo.studio(this.publicScope(ctx));
    if (!studio) {
      throw new NotFoundException({
        code: "Booking:ServiceUnavailable",
        message: "Booking:ServiceUnavailable",
      });
    }
    return { studio: OpenBukPublicStudioSchema.parse(studio) };
  }
  private async slots(scope: StudioScope, day: string, tx?: TransactionContext) {
    const studio = await this.repo.studio(scope, tx);
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
      tx
    );
    return { studio, slots: openBukAvailability(studio, day, now, busy) };
  }
  async availability(day: string, ctx: UseCaseContext) {
    const result = await this.slots(this.publicScope(ctx), day);
    return { slots: result.slots, timezone: result.studio.timezone };
  }
  async book(input: OpenBukBook, key: string, ctx: UseCaseContext) {
    const scope = this.publicScope(ctx);
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, `openbuk:${scope.workspaceId}`, tx);
      const saved = await this.repo.receipt(scope, key, tx);
      if (saved) {
        if (saved.fingerprint !== fingerprint) {
          throw new ConflictException({
            code: "Booking:IdempotencyMismatch",
            message: "Booking:IdempotencyMismatch",
          });
        }
        return { receipt: saved.receipt };
      }
      const initial = await this.repo.studio(scope, tx);
      if (!initial || initial.serviceId !== input.serviceId || initial.staffId !== input.staffId) {
        throw new NotFoundException({
          code: "Booking:ServiceUnavailable",
          message: "Booking:ServiceUnavailable",
        });
      }
      await this.repo.lock(scope, initial.staffId, tx);
      const { studio, slots } = await this.slots(
        scope,
        studioDate(new Date(input.startAt), initial.timezone),
        tx
      );
      const slot = slots.find((s) => s.startAt === new Date(input.startAt).toISOString());
      if (!slot) {
        throw new ConflictException({
          code: "Booking:SlotUnavailable",
          message: "Booking:SlotUnavailable",
        });
      }
      const receipt: OpenBukReceipt = {
        ...slot,
        reference: `OB-${randomBytes(6).toString("hex").toUpperCase()}`,
        serviceName: studio.serviceName,
        staffName: studio.staffName,
        priceCents: studio.priceCents,
        currency: studio.currency,
        timezone: studio.timezone,
      };
      const bookingId = await this.repo.create(scope, studio, input, receipt, tx);
      await this.repo.saveReceipt(scope, key, { fingerprint, receipt }, tx);
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: "public",
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
      return { receipt };
    });
  }
  async appointments(day: string, ctx: UseCaseContext) {
    // Customer contact snapshots are operational data; initial roles are owner/admin.
    const { scope } = await this.admin(ctx, true);
    return { appointments: await this.repo.appointments(scope, day) };
  }
}
