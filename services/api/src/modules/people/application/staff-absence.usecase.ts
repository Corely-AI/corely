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
  RecordStaffAbsenceSchema,
  CorrectStaffAbsenceSchema,
  CancelStaffAbsenceSchema,
  StaffAbsenceWindowQuerySchema,
  PersonnelAttachmentUploadSchema,
  type StaffAbsence,
  type StaffAbsenceRevision,
  type StaffLinkScope,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  CLOCK_PORT_TOKEN,
  type AuditPort,
  type OutboxPort,
  type ClockPort,
  type UseCaseContext,
  type TransactionContext,
} from "@corely/kernel";
import { GetEffectivePermissionsUseCase } from "../../identity/public";
import { TenantEntitlementService } from "../../platform/public";
import { PERSONNEL_DOCUMENTS, type PersonnelDocumentsPort } from "../../documents/public";
import { STAFF_REPOSITORY, type StaffRepositoryPort } from "./ports/staff-repository.port";
import { STAFF_ABSENCE_REPOSITORY, type StaffAbsenceRepository } from "./ports/staff-absence.port";
import { STAFF_BOOKING, type StaffBookingPort } from "./ports/staff-availability.port";
import { absenceInterval, absenceBlocks } from "../domain/staff-absence";

type Action = "record" | "correct" | "cancel";
@Injectable()
export class StaffAbsenceUseCase {
  constructor(
    @Inject(STAFF_REPOSITORY) private readonly staff: StaffRepositoryPort,
    @Inject(STAFF_ABSENCE_REPOSITORY) private readonly absences: StaffAbsenceRepository,
    private readonly permissions: GetEffectivePermissionsUseCase,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(STAFF_BOOKING) private readonly booking: StaffBookingPort,
    @Inject(PERSONNEL_DOCUMENTS) private readonly documents: PersonnelDocumentsPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  private async authorize(
    ctx: UseCaseContext,
    extra: string[],
    tx?: TransactionContext
  ): Promise<StaffLinkScope> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);
    if (
      ["people.directory.read", ...extra].some(
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
  private async profile(scope: StaffLinkScope, staffId: string, tx: TransactionContext) {
    const profile = await this.staff.get(scope, staffId, tx);
    if (!profile || profile.workspaceId !== scope.workspaceId) {
      throw new NotFoundException("Staff profile not found");
    }
    return profile;
  }
  private async record(scope: StaffLinkScope, staffId: string, id: string, tx: TransactionContext) {
    const record = await this.absences.get(scope, id, tx);
    if (!record || record.staffId !== staffId || record.workspaceId !== scope.workspaceId) {
      throw new NotFoundException("Absence not found");
    }
    return record;
  }
  private commandIdentity(
    kind: string,
    staffId: string,
    id: string | null,
    input: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    if (!key || !/^[\w-]{1,160}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const hash = (value: unknown) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");
    return { commandKey: hash([ctx.userId, key]), fingerprint: hash([kind, staffId, id, input]) };
  }
  async list(staffId: string, ctx: UseCaseContext) {
    const required = ["people.private.read"];
    const scope = await this.authorize(ctx, required);
    return this.staff.transaction(scope, async (tx) => {
      await this.authorize(ctx, required, tx);
      await this.profile(scope, staffId, tx);
      return { items: await this.absences.list(scope, staffId, tx) };
    });
  }
  async neutral(staffId: string, query: unknown, ctx: UseCaseContext) {
    const scope = await this.authorize(ctx, []);
    const parsed = StaffAbsenceWindowQuerySchema.parse(query);
    const from = new Date(parsed.from).toISOString(),
      to = new Date(parsed.to).toISOString();
    return this.staff.transaction(scope, async (tx) => {
      await this.authorize(ctx, [], tx);
      const profile = await this.profile(scope, staffId, tx);
      const records = await this.absences.list(scope, staffId, tx);
      return {
        staffId,
        resourceId: profile.resourceId,
        evaluatedAt: this.clock.now().toISOString(),
        items: records.flatMap((record) =>
          absenceBlocks([record])
            .filter((block) => block.startAt < to && block.endAt > from)
            .map((block) => ({
              absenceId: record.id,
              staffId,
              resourceId: profile.resourceId,
              startAt: block.startAt < from ? from : block.startAt,
              endAt: block.endAt > to ? to : block.endAt,
              version: record.revisions[record.revisions.length - 1].version,
              status: "unavailable" as const,
            }))
        ),
      };
    });
  }
  async command(
    action: Action,
    staffId: string,
    id: string | null,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const required = ["people.profile.manage", "people.private.read", "people.private.manage"];
    const scope = await this.authorize(ctx, required);
    const input =
      action === "record"
        ? RecordStaffAbsenceSchema.parse(body)
        : action === "correct"
          ? CorrectStaffAbsenceSchema.parse(body)
          : CancelStaffAbsenceSchema.parse(body);
    const { commandKey, fingerprint } = this.commandIdentity(action, staffId, id, input, key, ctx);
    return this.staff.transaction(scope, async (tx) => {
      await this.authorize(ctx, required, tx);
      const profile = await this.profile(scope, staffId, tx);
      if (profile.resourceId) {
        await this.booking.lock(scope, [profile.resourceId], tx);
      }
      const replay = await this.absences.replay(scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used");
        }
        return this.record(scope, staffId, replay.absenceId, tx);
      }
      if (profile.archivedAt) {
        throw new ConflictException("Archived staff cannot be changed");
      }
      const previous = id ? await this.record(scope, staffId, id, tx) : null;
      const current = previous?.revisions.at(-1);
      if (
        current &&
        (("version" in input && input.version !== current.version) ||
          current.status === "cancelled")
      ) {
        throw new ConflictException("Absence changed; reload before saving");
      }
      if (action !== "record" && !current) {
        throw new NotFoundException("Absence not found");
      }
      let fields: Pick<StaffAbsenceRevision, "range" | "reason" | "notes" | "startAt" | "endAt">;
      try {
        if ("range" in input) {
          fields = { ...input, ...absenceInterval(input.range) };
        } else if (current) {
          fields = current;
        } else {
          throw new NotFoundException("Absence not found");
        }
      } catch {
        throw new BadRequestException("Civil date does not exist in this timezone");
      }
      const now = this.clock.now().toISOString();
      if (fields.endAt <= now || (current && current.endAt <= now)) {
        throw new BadRequestException("Ended absences cannot be rewritten");
      }
      if (action !== "cancel") {
        const start = fields.startAt < now ? now : fields.startAt;
        const overlaps = (await this.absences.list(scope, staffId, tx)).some(
          (record) =>
            record.id !== id &&
            absenceBlocks([record]).some(
              (block) => block.startAt < fields.endAt && block.endAt > start
            )
        );
        if (overlaps) {
          throw new ConflictException("Absence overlaps an existing approved absence");
        }
      }
      const revision: StaffAbsenceRevision = {
        range: fields.range,
        reason: fields.reason,
        notes: fields.notes,
        startAt: fields.startAt,
        endAt: fields.endAt,
        status: action === "cancel" ? "cancelled" : "approved",
        version: (current?.version ?? 0) + 1,
        changedAt: now,
        changedBy: ctx.userId ?? "",
      };
      const next: StaffAbsence = {
        id: previous?.id ?? randomUUID(),
        staffId,
        workspaceId: scope.workspaceId,
        revisions: [...(previous?.revisions ?? []), revision],
      };
      // Reserve one revision and storage headroom so an active absence can still be cancelled.
      if (
        next.revisions.length > 256 ||
        (action !== "cancel" &&
          (next.revisions.length >= 256 ||
            Buffer.byteLength(JSON.stringify(next), "utf8") > 900 * 1024))
      ) {
        throw new BadRequestException("Absence history limit reached");
      }
      await this.absences.save(scope, next, tx);
      // Operational outbox/audit contains no reason, note, actor-private details or file references.
      const metadata = {
        workspaceId: scope.workspaceId,
        absenceId: next.id,
        staffId,
        resourceId: profile.resourceId,
        version: revision.version,
        status: revision.status,
        startAt: revision.startAt,
        endAt: revision.endAt,
        effectiveAt: now,
        previousInterval: current ? { startAt: current.startAt, endAt: current.endAt } : null,
      };
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: `people.absence.${action}`,
          entityType: "StaffAbsence",
          entityId: next.id,
          metadata,
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: "people.absence.changed",
          payload: metadata,
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.absences.saveReplay(scope, commandKey, { fingerprint, absenceId: next.id }, tx);
      return next;
    });
  }
  private async withAttachment<T>(
    staffId: string,
    id: string,
    ctx: UseCaseContext,
    write: boolean,
    work: (scope: StaffLinkScope, record: StaffAbsence, tx: TransactionContext) => Promise<T>
  ) {
    const required = [
      "people.private.read",
      "people.documents.read",
      ...(write ? ["people.profile.manage", "people.private.manage"] : []),
    ];
    const scope = await this.authorize(ctx, required);
    return this.staff.transaction(scope, async (tx) => {
      await this.authorize(ctx, required, tx);
      const profile = await this.profile(scope, staffId, tx);
      if (write && profile.archivedAt) {
        throw new ConflictException("Archived staff cannot be changed");
      }
      const record = await this.record(scope, staffId, id, tx);
      const result = await work(scope, record, tx);
      // Especially for slow storage I/O, recheck current grants before returning bytes.
      await this.authorize(ctx, required, tx);
      return result;
    });
  }
  async attachments(staffId: string, id: string, ctx: UseCaseContext) {
    return this.withAttachment(staffId, id, ctx, false, async (scope, record, tx) => ({
      items: await this.documents.list({ ...scope, absenceId: record.id }, tx),
    }));
  }
  async upload(
    staffId: string,
    id: string,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    // Authorize before parsing or decoding private content.
    return this.withAttachment(staffId, id, ctx, true, async (scope, record, tx) => {
      const input = PersonnelAttachmentUploadSchema.parse(body);
      const { commandKey, fingerprint } = this.commandIdentity(
        "attachment",
        staffId,
        id,
        input,
        key,
        ctx
      );
      const owner = { ...scope, absenceId: record.id };
      const replay = await this.absences.replay(scope, commandKey, tx);
      const items = await this.documents.list(owner, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used");
        }
        const attachment = items.find((item) => item.documentId === replay.documentId);
        if (!attachment) {
          throw new NotFoundException("Attachment not found");
        }
        return attachment;
      }
      const current = record.revisions[record.revisions.length - 1];
      if (current.version !== input.version || current.status !== "approved") {
        throw new ConflictException("Absence changed; reload before saving");
      }
      if (items.length >= 10) {
        throw new BadRequestException("Attachment limit reached");
      }
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 1024 * 1024) {
        throw new BadRequestException("Attachment must be 1 byte to 1 MiB");
      }
      const attachment = await this.documents.upload(
        owner,
        { filename: input.filename, contentType: input.contentType, bytes },
        tx
      );
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "",
          action: "people.absence.attachment-added",
          entityType: "StaffAbsence",
          entityId: id,
          metadata: { workspaceId: scope.workspaceId, version: current.version },
        },
        tx
      );
      await this.absences.saveReplay(
        scope,
        commandKey,
        { fingerprint, absenceId: id, documentId: attachment.documentId },
        tx
      );
      return attachment;
    });
  }
  async download(staffId: string, id: string, documentId: string, ctx: UseCaseContext) {
    return this.withAttachment(staffId, id, ctx, false, (scope, record, tx) =>
      this.documents.download({ ...scope, absenceId: record.id }, documentId, tx)
    );
  }
}
