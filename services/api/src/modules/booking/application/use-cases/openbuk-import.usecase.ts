import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  OpenBukImportApplySchema,
  OpenBukImportInputSchema,
  OpenBukImportRowSchema,
  type OpenBukImportConfirmedRow,
  type OpenBukImportInput,
  type OpenBukImportResult,
  type OpenBukReceipt,
  type OpenBukStudio,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  CLOCK_PORT_TOKEN,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
  type ClockPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import type { BookingPolicyRegistration } from "@corely/booking/extensions";
import { AuthorizeWorkspaceUseCase, PilotSetupUseCase } from "../../../workspaces/public";
import { importDigest, matchesSourceTime, sourceTimezone } from "../../domain/openbuk-import-time";
import { studioDate } from "../../domain/openbuk-availability";
import { BOOKING_POLICIES, enforceBookingPolicy } from "../booking-policy";
import {
  OPENBUK_REPOSITORY,
  type OpenBukRepositoryPort,
  type StudioScope,
} from "../ports/openbuk-repository.port";
import {
  OPENBUK_IMPORT_LEDGER,
  type BookingImportLedger,
} from "../ports/openbuk-import-ledger.port";
import { OpenBukStudioUseCase } from "./openbuk-studio.usecase";

type Row = OpenBukImportResult["rows"][number];
type ImportError = Extract<Row, { status: "ERROR" }>["error"];
type Pending = {
  identity: string;
  hash: string;
  appointment?: {
    input: OpenBukImportConfirmedRow;
    studio: OpenBukStudio;
    receipt: OpenBukReceipt;
  };
};
type ReviewedRow = { result: Row; pending?: Pending };
type Occupancy = { staffId: string; start: number; end: number };

@Injectable()
export class OpenBukImportUseCase {
  constructor(
    @Inject(OPENBUK_REPOSITORY) private readonly repo: OpenBukRepositoryPort,
    @Inject(OPENBUK_IMPORT_LEDGER) private readonly ledger: BookingImportLedger,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(BOOKING_POLICIES) private readonly policies: readonly BookingPolicyRegistration[],
    private readonly studio: OpenBukStudioUseCase,
    private readonly authority: AuthorizeWorkspaceUseCase,
    private readonly pilot: PilotSetupUseCase
  ) {}

  async preview(body: unknown, ctx: UseCaseContext) {
    return this.run(OpenBukImportInputSchema.parse(body), ctx);
  }

  async apply(body: unknown, ctx: UseCaseContext) {
    const input = OpenBukImportApplySchema.parse(body);
    return this.run(input.batch, ctx, input.preview);
  }

  private async run(
    batch: OpenBukImportInput,
    ctx: UseCaseContext,
    approval?: string
  ): Promise<OpenBukImportResult> {
    if (!ctx.tenantId || !ctx.userId || !ctx.workspaceId) {
      throw new BadRequestException("Select a studio workspace");
    }
    const scope = { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
    const userId = ctx.userId;
    await this.authority.execute({ ...scope, userId, manage: true });
    let timezone: Intl.DateTimeFormat;
    try {
      timezone = sourceTimezone(batch.timezone);
    } catch {
      throw new BadRequestException("Source timezone is invalid");
    }
    const preview = importDigest([scope, batch]);
    if (approval && approval !== preview) {
      throw new ConflictException("Import data changed. Preview the exact batch again");
    }

    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(scope, "openbuk:" + scope.workspaceId, tx);
      await this.pilot.requirePrivateBooking(ctx, tx);
      await this.lockResources(scope, batch, tx);
      const reviewed: ReviewedRow[] = [];
      const seen = new Set<string>();
      const occupancy: Occupancy[] = [];
      for (const [index, raw] of batch.rows.entries()) {
        reviewed.push(
          await this.reviewRow(scope, batch, { raw, index, timezone, seen, occupancy }, tx)
        );
      }
      const applied =
        approval !== undefined && !reviewed.some(({ result }) => result.status === "ERROR");
      if (applied) {
        for (const row of reviewed) {
          if (row.pending) {
            const bookingId = await this.persist(
              scope,
              userId,
              batch,
              preview,
              row.result.index,
              row.pending,
              tx
            );
            row.result = {
              index: row.result.index,
              sourceId: row.result.sourceId,
              status: "IMPORTED",
              bookingId,
            };
          }
        }
      }
      return {
        preview,
        applied,
        exportHash: batch.exportHash,
        exportedAt: batch.exportedAt,
        rows: reviewed.map(({ result }) => result),
      };
    });
  }

  private async lockResources(
    scope: StudioScope,
    batch: OpenBukImportInput,
    tx: TransactionContext
  ) {
    const resources = new Set<string>();
    for (const raw of batch.rows) {
      const row = OpenBukImportRowSchema.safeParse(raw);
      if (row.success && row.data.status === "CONFIRMED") {
        const selection = this.selection(batch, row.data);
        if (selection && (await this.repo.studio(scope, tx, selection))) {
          resources.add(selection.staffId);
        }
      }
    }
    for (const id of [...resources].sort()) {
      await this.repo.lock(scope, id, tx);
    }
  }

  private selection(batch: OpenBukImportInput, row: OpenBukImportConfirmedRow) {
    if (
      !Object.hasOwn(batch.services, row.sourceServiceId) ||
      !Object.hasOwn(batch.staff, row.sourceStaffId)
    ) {
      return null;
    }
    return {
      serviceId: batch.services[row.sourceServiceId],
      staffId: batch.staff[row.sourceStaffId],
    };
  }

  private async reviewRow(
    scope: StudioScope,
    batch: OpenBukImportInput,
    frame: {
      raw: unknown;
      index: number;
      timezone: Intl.DateTimeFormat;
      seen: Set<string>;
      occupancy: Occupancy[];
    },
    tx: TransactionContext
  ): Promise<ReviewedRow> {
    const row = OpenBukImportRowSchema.safeParse(frame.raw);
    const index = frame.index;
    const sourceId = row.success ? row.data.sourceId : null;
    const error = (code: ImportError): ReviewedRow => ({
      result: { index, sourceId, status: "ERROR", error: code },
    });
    if (!row.success) {
      return error("INVALID_ROW");
    }
    const value = row.data;
    if (frame.seen.has(value.sourceId)) {
      return error("DUPLICATE_SOURCE");
    }
    frame.seen.add(value.sourceId);
    const selection = value.status === "CONFIRMED" ? this.selection(batch, value) : null;
    const identity = importDigest([batch.source, value.sourceId]);
    const hash = importDigest([value, selection, batch.timezone]);
    const existing = await this.ledger.get(scope, identity, tx);
    if (existing) {
      return existing.fingerprint === hash
        ? { result: { index, sourceId, status: "IMPORTED", bookingId: existing.bookingId } }
        : error("CHANGED_SOURCE");
    }
    if (value.status === "CANCELLED") {
      return { result: { index, sourceId, status: "CANCELLED" }, pending: { identity, hash } };
    }
    if (!selection) {
      return error("MISSING_MAPPING");
    }
    if (!matchesSourceTime(value, frame.timezone)) {
      return error("TIMEZONE_MISMATCH");
    }
    const config = await this.repo.studio(scope, tx, selection);
    if (!config) {
      return error("MISSING_MAPPING");
    }
    if (config.currency !== value.currency) {
      return error("CURRENCY_MISMATCH");
    }
    const start = new Date(value.startAt);
    const end = new Date(value.endAt);
    const { studio, slots } = await this.studio.bookingSlots(
      scope,
      studioDate(start, config.timezone),
      selection,
      tx
    );
    const slot = slots.find(
      (item) => item.startAt === start.toISOString() && item.endAt === end.toISOString()
    );
    if (!slot) {
      return error("SLOT_UNAVAILABLE");
    }
    try {
      enforceBookingPolicy(this.policies, scope, start, end, this.clock.now());
    } catch (cause) {
      if (!(cause instanceof BadRequestException || cause instanceof ConflictException)) {
        throw cause;
      }
      return error("SLOT_UNAVAILABLE");
    }
    const occupied = {
      staffId: studio.staffId,
      start: Number(start) - studio.bufferBeforeMinutes * 60_000,
      end: Number(end) + studio.bufferAfterMinutes * 60_000,
    };
    if (
      frame.occupancy.some(
        (item) =>
          item.staffId === occupied.staffId &&
          item.start < occupied.end &&
          occupied.start < item.end
      )
    ) {
      return error("BATCH_OVERLAP");
    }
    frame.occupancy.push(occupied);
    return {
      result: {
        index,
        sourceId,
        status: "READY",
        appointment: {
          sourceServiceId: value.sourceServiceId,
          sourceStaffId: value.sourceStaffId,
          serviceId: studio.serviceId,
          staffId: studio.staffId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          timezone: studio.timezone,
          priceCents: value.priceCents,
          currency: value.currency,
        },
      },
      pending: {
        identity,
        hash,
        appointment: {
          input: value,
          studio,
          receipt: {
            ...slot,
            reference: "IM-" + randomBytes(6).toString("hex").toUpperCase(),
            serviceName: studio.serviceName,
            staffName: studio.staffName,
            timezone: studio.timezone,
            priceCents: value.priceCents,
            currency: value.currency,
          },
        },
      },
    };
  }

  private async persist(
    scope: StudioScope,
    userId: string,
    batch: OpenBukImportInput,
    preview: string,
    index: number,
    pending: Pending,
    tx: TransactionContext
  ) {
    const write = pending.appointment;
    const bookingId = write
      ? await this.repo.create(scope, write.studio, write.input, write.receipt, tx)
      : null;
    await this.ledger.save(scope, pending.identity, { fingerprint: pending.hash, bookingId }, tx);
    const metadata = {
      workspaceId: scope.workspaceId,
      source: "openbuk-import",
      sourceNamespace: batch.source,
      sourceIdentity: pending.identity,
      exportHash: batch.exportHash,
      preview,
      appliedRow: index,
    };
    await this.audit.log(
      {
        tenantId: scope.tenantId,
        userId,
        action: "booking.imported",
        entityType: bookingId ? "Booking" : "Workspace",
        entityId: bookingId ?? scope.workspaceId,
        metadata,
      },
      tx
    );
    if (bookingId) {
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: "booking.created",
          payload: {
            bookingId,
            workspaceId: scope.workspaceId,
            status: "CONFIRMED",
            source: "openbuk-import",
          },
        },
        tx
      );
    }
    return bookingId;
  }
}
