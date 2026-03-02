import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import { ACTIVITY_REPO_PORT, type ActivityRepoPort } from "../../ports/activity-repository.port";
import { DEAL_REPO_PORT, type DealRepoPort } from "../../ports/deal-repository.port";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";
import {
  ENROLLMENT_REPO_PORT,
  type EnrollmentRepoPort,
} from "../../ports/enrollment-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { PrismaPartyRepoAdapter } from "../../../../party/infrastructure/prisma/prisma-party-repo.adapter";
import { CLOCK_PORT_TOKEN } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";

const REPLIED_STAGE_ID = "qualified";

type ProcessResendInboundEmailInput = {
  tenantId: string;
  payload: Record<string, unknown>;
};

type ProcessResendInboundEmailOutput = { ok: true };

type NormalizedInboundEmail = {
  externalMessageId: string;
  externalThreadId: string | null;
  inReplyToMessageIds: string[];
  referenceMessageIds: string[];
  dealIdFromAlias: string | null;
  fromEmail: string | null;
  toEmails: string[];
  subject: string;
  body: string | null;
  eventType: string;
  eventTimestamp: Date;
};

@RequireTenant()
@Injectable()
export class ProcessResendInboundEmailUseCase extends BaseUseCase<
  ProcessResendInboundEmailInput,
  ProcessResendInboundEmailOutput
> {
  constructor(
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort,
    @Inject(ENROLLMENT_REPO_PORT) private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly partyRepo: PrismaPartyRepoAdapter,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: ProcessResendInboundEmailInput): ProcessResendInboundEmailInput {
    if (!input.tenantId) {
      throw new ValidationError("tenantId is required");
    }
    if (!input.payload || typeof input.payload !== "object") {
      throw new ValidationError("payload is required");
    }
    return input;
  }

  protected async handle(
    input: ProcessResendInboundEmailInput,
    _ctx: UseCaseContext
  ): Promise<Result<ProcessResendInboundEmailOutput, UseCaseError>> {
    const now = this.clock.now();
    const normalized = this.normalizeInbound(input.payload, now);

    const inserted = await this.activityRepo.upsertWebhookEvent({
      tenantId: input.tenantId,
      providerKey: "resend",
      channelKey: "email",
      externalMessageId: normalized.externalMessageId,
      eventType: normalized.eventType,
      eventTimestamp: normalized.eventTimestamp,
      payload: input.payload,
    });

    if (!inserted) {
      return ok({ ok: true });
    }

    const linkedActivity = await this.findLinkedActivity(input.tenantId, normalized);

    const relatedDeal = await this.resolveDeal(input.tenantId, normalized, linkedActivity);
    const dealId = relatedDeal?.id ?? null;

    let leadId = this.resolveLeadIdFromMetadata(linkedActivity);
    if (!leadId && dealId) {
      const leadByDeal = await this.leadRepo.findByConvertedDealId(input.tenantId, dealId);
      leadId = leadByDeal?.id ?? null;
    }
    if (!leadId && normalized.fromEmail) {
      const leadByEmail = await this.leadRepo.findLatestByEmail(
        input.tenantId,
        normalized.fromEmail
      );
      leadId = leadByEmail?.id ?? null;
    }

    let partyId = linkedActivity?.partyId ?? null;
    if (!partyId && normalized.fromEmail) {
      const party = await this.partyRepo.findPartyByEmail(input.tenantId, normalized.fromEmail);
      partyId = party?.id ?? null;
    }
    if (!partyId && dealId) {
      partyId = relatedDeal?.partyId ?? null;
    }
    if (!partyId && leadId) {
      const lead = await this.leadRepo.findById(input.tenantId, leadId);
      partyId = lead?.convertedPartyId ?? null;
    }

    if (leadId || partyId || dealId) {
      const activity = ActivityEntity.create({
        id: this.idGenerator.newId(),
        tenantId: input.tenantId,
        type: "COMMUNICATION",
        channelKey: "email",
        direction: "INBOUND",
        communicationStatus: "LOGGED",
        subject: normalized.subject,
        body: normalized.body,
        leadId,
        partyId,
        dealId,
        toRecipients: normalized.toEmails.length ? normalized.toEmails : null,
        participants: normalized.fromEmail ? [normalized.fromEmail] : null,
        providerKey: "resend",
        externalMessageId: normalized.externalMessageId,
        externalThreadId: normalized.externalThreadId ?? linkedActivity?.externalThreadId ?? null,
        threadKey: normalized.externalThreadId ?? linkedActivity?.externalThreadId ?? null,
        recordSource: "INTEGRATION",
        rawProviderPayload: input.payload,
        metadata: {
          eventType: normalized.eventType,
          inReplyToMessageIds: normalized.inReplyToMessageIds,
          referenceMessageIds: normalized.referenceMessageIds,
          linkedActivityId: linkedActivity?.id ?? null,
          dealIdFromAlias: normalized.dealIdFromAlias,
        },
        createdAt: now,
        createdByUserId: null,
      });

      await this.activityRepo.create(input.tenantId, activity);
    }

    if (leadId) {
      await this.leadRepo.touchLastRepliedAt(input.tenantId, leadId, now);
    }

    if (dealId && relatedDeal && relatedDeal.status === "OPEN") {
      if (relatedDeal.stageId === "lead") {
        const previousStageId = relatedDeal.stageId;
        relatedDeal.moveToStage(REPLIED_STAGE_ID, now);
        await this.dealRepo.update(input.tenantId, relatedDeal);
        await this.dealRepo.recordStageTransition({
          tenantId: input.tenantId,
          dealId,
          fromStageId: previousStageId,
          toStageId: REPLIED_STAGE_ID,
          transitionedByUserId: null,
          transitionedAt: now,
        });
      }

      const enrollmentId = this.resolveEnrollmentIdFromMetadata(linkedActivity);
      let canceled = false;
      if (enrollmentId) {
        canceled = await this.enrollmentRepo.cancelById(enrollmentId);
      }
      if (!canceled) {
        await this.enrollmentRepo.cancelPendingByDealContext(input.tenantId, dealId);
      }
    }

    return ok({ ok: true });
  }

  private async findLinkedActivity(
    tenantId: string,
    normalized: NormalizedInboundEmail
  ): Promise<ActivityEntity | null> {
    for (const messageId of [
      ...normalized.inReplyToMessageIds,
      ...normalized.referenceMessageIds,
    ]) {
      const byMessage = await this.activityRepo.findCommunicationByExternalMessageId(
        tenantId,
        "resend",
        messageId
      );
      if (byMessage) {
        return byMessage;
      }
    }

    if (normalized.externalThreadId) {
      const byThread = await this.activityRepo.findCommunicationByExternalThreadId(
        tenantId,
        "resend",
        normalized.externalThreadId
      );
      if (byThread) {
        return byThread;
      }
    }

    if (normalized.fromEmail) {
      return this.activityRepo.findLatestOutboundCommunicationByRecipient(
        tenantId,
        "resend",
        normalized.fromEmail
      );
    }

    return null;
  }

  private normalizeInbound(payload: Record<string, unknown>, now: Date): NormalizedInboundEmail {
    const headers = this.normalizeHeaders(payload);
    const subject =
      this.pickString(payload, ["data", "subject"]) ??
      this.pickString(payload, ["subject"]) ??
      "Inbound reply";

    const body =
      this.pickString(payload, ["data", "text"]) ??
      this.pickString(payload, ["text"]) ??
      this.pickString(payload, ["data", "html"]) ??
      this.pickString(payload, ["html"]) ??
      null;

    const fromEmail =
      this.extractEmails(this.pickUnknown(payload, ["data", "from"]))[0] ??
      this.extractEmails(this.pickUnknown(payload, ["from"]))[0] ??
      null;

    const toEmails = [
      ...this.extractEmails(this.pickUnknown(payload, ["data", "to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["data", "envelope", "to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["envelope", "to"])),
    ];

    const inReplyToMessageIds = this.parseMessageIdList(headers.get("in-reply-to"));
    const referenceMessageIds = this.parseMessageIdList(headers.get("references"));

    const externalMessageId =
      this.stripMessageId(this.pickString(payload, ["data", "email_id"])) ??
      this.stripMessageId(this.pickString(payload, ["data", "id"])) ??
      this.stripMessageId(this.pickString(payload, ["email_id"])) ??
      this.stripMessageId(this.pickString(payload, ["id"])) ??
      this.stripMessageId(headers.get("message-id") ?? null) ??
      this.idGenerator.newId();

    const externalThreadId =
      this.pickString(payload, ["data", "thread_id"]) ??
      this.pickString(payload, ["data", "threadId"]) ??
      this.pickString(payload, ["thread_id"]) ??
      this.pickString(payload, ["threadId"]) ??
      referenceMessageIds.at(0) ??
      inReplyToMessageIds.at(0) ??
      null;

    const eventTimestampRaw =
      this.pickString(payload, ["created_at"]) ??
      this.pickString(payload, ["data", "created_at"]) ??
      this.pickString(payload, ["timestamp"]) ??
      this.pickString(payload, ["data", "timestamp"]);

    const parsedTimestamp = eventTimestampRaw ? new Date(eventTimestampRaw) : null;

    return {
      externalMessageId,
      externalThreadId,
      inReplyToMessageIds,
      referenceMessageIds,
      dealIdFromAlias: this.parseDealIdFromAlias(toEmails),
      fromEmail,
      toEmails: Array.from(new Set(toEmails.map((email) => email.toLowerCase()))),
      subject,
      body,
      eventType: this.pickString(payload, ["type"]) ?? "email.received",
      eventTimestamp:
        parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime()) ? parsedTimestamp : now,
    };
  }

  private normalizeHeaders(payload: Record<string, unknown>): Map<string, string> {
    const headers = new Map<string, string>();
    const rawHeaders = this.pickUnknown(payload, ["data", "headers"]);

    if (Array.isArray(rawHeaders)) {
      for (const header of rawHeaders) {
        if (!header || typeof header !== "object") {
          continue;
        }
        const name = this.pickString(header as Record<string, unknown>, ["name"]);
        const value = this.pickString(header as Record<string, unknown>, ["value"]);
        if (name && value) {
          headers.set(name.toLowerCase(), value);
        }
      }
      return headers;
    }

    if (rawHeaders && typeof rawHeaders === "object") {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (typeof value === "string" && value.length > 0) {
          headers.set(key.toLowerCase(), value);
        }
      }
    }

    return headers;
  }

  private extractEmails(value: unknown): string[] {
    if (typeof value === "string") {
      return this.extractEmailsFromText(value);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractEmails(item));
    }

    if (value && typeof value === "object") {
      const asRecord = value as Record<string, unknown>;
      const direct = asRecord.email;
      if (typeof direct === "string") {
        return this.extractEmailsFromText(direct);
      }

      const nested = asRecord.address;
      if (typeof nested === "string") {
        return this.extractEmailsFromText(nested);
      }

      return Object.values(asRecord).flatMap((item) => this.extractEmails(item));
    }

    return [];
  }

  private extractEmailsFromText(text: string): string[] {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    return matches.map((match) => match.trim());
  }

  private stripMessageId(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/<([^>]+)>/);
    const normalized = (match ? match[1] : value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseMessageIdList(value: string | undefined): string[] {
    if (!value) {
      return [];
    }
    const bracketMatches = [...value.matchAll(/<([^>]+)>/g)].map((match) => match[1]?.trim() ?? "");
    const candidates = bracketMatches.length > 0 ? bracketMatches : value.split(/\s+/);
    return Array.from(
      new Set(
        candidates
          .map((candidate) => this.stripMessageId(candidate))
          .filter((candidate): candidate is string => Boolean(candidate))
      )
    );
  }

  private parseDealIdFromAlias(recipients: string[]): string | null {
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

    for (const email of recipients) {
      const localPart = email.split("@")[0] ?? "";
      const plusPayload = localPart.includes("+")
        ? localPart.split("+").slice(1).join("+")
        : localPart;
      const match = plusPayload.match(uuidPattern) ?? localPart.match(uuidPattern);
      if (match) {
        return match[0].toLowerCase();
      }
    }

    return null;
  }

  private async resolveDeal(
    tenantId: string,
    normalized: NormalizedInboundEmail,
    linkedActivity: ActivityEntity | null
  ) {
    const metadataDealId = this.resolveDealIdFromMetadata(linkedActivity);
    const candidateDealIds = Array.from(
      new Set(
        [normalized.dealIdFromAlias, linkedActivity?.dealId ?? null, metadataDealId].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

    for (const dealId of candidateDealIds) {
      const deal = await this.dealRepo.findById(tenantId, dealId);
      if (deal) {
        return deal;
      }
    }

    return null;
  }

  private resolveLeadIdFromMetadata(linkedActivity: ActivityEntity | null): string | null {
    if (!linkedActivity?.metadata || typeof linkedActivity.metadata !== "object") {
      return linkedActivity?.leadId ?? null;
    }

    const metadata = linkedActivity.metadata as Record<string, unknown>;
    const value = metadata.leadId ?? metadata.resolvedLeadId;
    return typeof value === "string" && value.length > 0 ? value : (linkedActivity.leadId ?? null);
  }

  private resolveDealIdFromMetadata(linkedActivity: ActivityEntity | null): string | null {
    if (!linkedActivity?.metadata || typeof linkedActivity.metadata !== "object") {
      return null;
    }
    const metadata = linkedActivity.metadata as Record<string, unknown>;
    const value = metadata.contextDealId ?? metadata.dealId;
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private resolveEnrollmentIdFromMetadata(linkedActivity: ActivityEntity | null): string | null {
    if (!linkedActivity?.metadata || typeof linkedActivity.metadata !== "object") {
      return null;
    }
    const metadata = linkedActivity.metadata as Record<string, unknown>;
    const value = metadata.sequenceEnrollmentId;
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private pickUnknown(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private pickString(obj: Record<string, unknown>, path: string[]): string | null {
    const value = this.pickUnknown(obj, path);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }
}
