import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import { ActivityEntity } from "../../domain/activity.entity";
import type {
  ActivityRepoPort,
  ListActivitiesFilters,
  ListActivitiesResult,
  TimelineItem,
  TimelineResult,
  UpsertWebhookEventInput,
} from "../../application/ports/activity-repository.port";

type ActivityRow = {
  id: string;
  tenantId: string;
  type: "NOTE" | "TASK" | "CALL" | "MEETING" | "COMMUNICATION" | "SYSTEM_EVENT" | "EMAIL_DRAFT";
  subject: string;
  body: string | null;
  channelKey: string | null;
  direction: "INBOUND" | "OUTBOUND" | null;
  communicationStatus:
    | "LOGGED"
    | "DRAFT"
    | "QUEUED"
    | "SENT"
    | "DELIVERED"
    | "READ"
    | "FAILED"
    | null;
  activityDate: Date | null;
  ownerId: string | null;
  recordSource: "MANUAL" | "SYSTEM" | "INTEGRATION" | null;
  recordSourceDetails: Record<string, unknown> | null;
  toRecipients: unknown;
  ccRecipients: unknown;
  participants: unknown;
  threadKey: string | null;
  externalThreadId: string | null;
  externalMessageId: string | null;
  providerKey: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawProviderPayload: Record<string, unknown> | null;
  attachments: unknown;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: "OPEN" | "COMPLETED" | "CANCELED";
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  outcome: string | null;
  durationSeconds: number | null;
  location: string | null;
  attendees: unknown;
  metadata: Record<string, unknown> | null;
};

const toStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length ? items : [];
};

const toRecordArray = (value: unknown): Array<Record<string, unknown>> | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null
  );
  return items.length ? items : [];
};

const toJsonInput = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
};

const toEntity = (row: ActivityRow): ActivityEntity => {
  const mappedType = row.type === "EMAIL_DRAFT" ? "COMMUNICATION" : row.type;
  return new ActivityEntity({
    id: row.id,
    tenantId: row.tenantId,
    type: mappedType,
    subject: row.subject,
    body: row.body,
    channelKey: row.channelKey,
    direction:
      row.direction ?? (row.messageDirection?.toLowerCase() === "inbound" ? "INBOUND" : "OUTBOUND"),
    communicationStatus:
      mappedType === "COMMUNICATION"
        ? (row.communicationStatus ?? "DRAFT")
        : row.communicationStatus,
    activityDate: row.activityDate ?? row.createdAt,
    ownerId: row.ownerId ?? row.assignedToUserId,
    recordSource: row.recordSource ?? "MANUAL",
    recordSourceDetails: row.recordSourceDetails,
    toRecipients: toStringArray(row.toRecipients),
    ccRecipients: toStringArray(row.ccRecipients),
    participants: toStringArray(row.participants),
    threadKey: row.threadKey,
    externalThreadId: row.externalThreadId,
    externalMessageId: row.externalMessageId,
    providerKey: row.providerKey,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    rawProviderPayload: row.rawProviderPayload,
    attachments: toRecordArray(row.attachments),
    messageDirection: row.messageDirection,
    messageTo: row.messageTo,
    openUrl: row.openUrl,
    partyId: row.partyId,
    dealId: row.dealId,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    status: row.status,
    assignedToUserId: row.assignedToUserId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    outcome: row.outcome,
    durationSeconds: row.durationSeconds,
    location: row.location,
    attendees: Array.isArray(row.attendees) ? row.attendees : null,
    metadata: row.metadata,
  });
};

@Injectable()
export class PrismaActivityRepoAdapter implements ActivityRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, activityId: string): Promise<ActivityEntity | null> {
    const row = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId },
    });

    if (!row) {
      return null;
    }

    return toEntity(row as ActivityRow);
  }

  async findCommunicationByExternalMessageId(
    tenantId: string,
    providerKey: string,
    externalMessageId: string
  ): Promise<ActivityEntity | null> {
    const row = await this.prisma.activity.findFirst({
      where: {
        tenantId,
        type: "COMMUNICATION",
        providerKey,
        externalMessageId,
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? toEntity(row as ActivityRow) : null;
  }

  async list(
    tenantId: string,
    filters: ListActivitiesFilters,
    pageSize = 20,
    cursor?: string
  ): Promise<ListActivitiesResult> {
    const where = {
      tenantId,
      ...(filters.partyId ? { partyId: filters.partyId } : {}),
      ...(filters.dealId ? { dealId: filters.dealId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.channelKey ? { channelKey: filters.channelKey } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
      ...(filters.communicationStatus ? { communicationStatus: filters.communicationStatus } : {}),
      ...(filters.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
      ...(filters.activityDateFrom || filters.activityDateTo
        ? {
            activityDate: {
              ...(filters.activityDateFrom ? { gte: filters.activityDateFrom } : {}),
              ...(filters.activityDateTo ? { lte: filters.activityDateTo } : {}),
            },
          }
        : {}),
    };

    const results = await this.prisma.activity.findMany({
      where,
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    const items = results.map((row) => toEntity(row as ActivityRow));
    const nextCursor = items.length === pageSize ? (items.at(-1)?.id ?? null) : null;

    return { items, nextCursor };
  }

  async create(tenantId: string, activity: ActivityEntity): Promise<void> {
    if (tenantId !== activity.tenantId) {
      throw new Error("Tenant mismatch when creating activity");
    }

    await this.prisma.activity.create({
      data: {
        id: activity.id,
        tenantId: activity.tenantId,
        type: activity.type,
        subject: activity.subject,
        body: activity.body,
        channelKey: activity.channelKey,
        direction: activity.direction,
        communicationStatus: activity.communicationStatus,
        activityDate: activity.activityDate,
        ownerId: activity.ownerId,
        recordSource: activity.recordSource,
        recordSourceDetails: toJsonInput(activity.recordSourceDetails),
        toRecipients: toJsonInput(activity.toRecipients),
        ccRecipients: toJsonInput(activity.ccRecipients),
        participants: toJsonInput(activity.participants),
        threadKey: activity.threadKey,
        externalThreadId: activity.externalThreadId,
        externalMessageId: activity.externalMessageId,
        providerKey: activity.providerKey,
        errorCode: activity.errorCode,
        errorMessage: activity.errorMessage,
        rawProviderPayload: toJsonInput(activity.rawProviderPayload),
        attachments: toJsonInput(activity.attachments),
        messageDirection: activity.messageDirection,
        messageTo: activity.messageTo,
        openUrl: activity.openUrl,
        partyId: activity.partyId,
        dealId: activity.dealId,
        dueAt: activity.dueAt,
        completedAt: activity.completedAt,
        status: activity.status,
        assignedToUserId: activity.assignedToUserId,
        createdByUserId: activity.createdByUserId,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
        outcome: activity.outcome,
        durationSeconds: activity.durationSeconds,
        location: activity.location,
        attendees: toJsonInput(activity.attendees),
        metadata: toJsonInput(activity.metadata),
      },
    });
  }

  async update(tenantId: string, activity: ActivityEntity): Promise<void> {
    if (tenantId !== activity.tenantId) {
      throw new Error("Tenant mismatch when updating activity");
    }

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: {
        type: activity.type,
        subject: activity.subject,
        body: activity.body,
        channelKey: activity.channelKey,
        direction: activity.direction,
        communicationStatus: activity.communicationStatus,
        activityDate: activity.activityDate,
        ownerId: activity.ownerId,
        recordSource: activity.recordSource,
        recordSourceDetails: toJsonInput(activity.recordSourceDetails),
        toRecipients: toJsonInput(activity.toRecipients),
        ccRecipients: toJsonInput(activity.ccRecipients),
        participants: toJsonInput(activity.participants),
        threadKey: activity.threadKey,
        externalThreadId: activity.externalThreadId,
        externalMessageId: activity.externalMessageId,
        providerKey: activity.providerKey,
        errorCode: activity.errorCode,
        errorMessage: activity.errorMessage,
        rawProviderPayload: toJsonInput(activity.rawProviderPayload),
        attachments: toJsonInput(activity.attachments),
        messageDirection: activity.messageDirection,
        messageTo: activity.messageTo,
        openUrl: activity.openUrl,
        partyId: activity.partyId,
        dealId: activity.dealId,
        dueAt: activity.dueAt,
        completedAt: activity.completedAt,
        status: activity.status,
        assignedToUserId: activity.assignedToUserId,
        updatedAt: activity.updatedAt,
        outcome: activity.outcome,
        durationSeconds: activity.durationSeconds,
        location: activity.location,
        attendees: toJsonInput(activity.attendees),
        metadata: toJsonInput(activity.metadata),
      },
    });
  }

  async getTimeline(
    tenantId: string,
    entityType: "party" | "deal",
    entityId: string,
    pageSize = 100,
    cursor?: string
  ): Promise<TimelineResult> {
    const activities = await this.prisma.activity.findMany({
      where: {
        tenantId,
        ...(entityType === "party" ? { partyId: entityId } : { dealId: entityId }),
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
    });

    const activityItems: TimelineItem[] = activities.map((raw) => {
      const activity = toEntity(raw as ActivityRow);
      const isCommunication = activity.type === "COMMUNICATION";
      return {
        id: activity.id,
        type: isCommunication ? ("MESSAGE" as const) : ("ACTIVITY" as const),
        timestamp: activity.activityDate ?? activity.createdAt,
        subject: activity.subject,
        body: activity.body,
        actorUserId: activity.createdByUserId,
        channelKey: activity.channelKey ?? undefined,
        direction: activity.direction ?? activity.messageDirection ?? undefined,
        status: activity.communicationStatus ?? undefined,
        to: activity.toRecipients?.at(0) ?? activity.messageTo ?? undefined,
        threadKey: activity.threadKey ?? activity.externalThreadId ?? undefined,
        openUrl: activity.openUrl ?? undefined,
        metadata: {
          activityType: activity.type,
          activityStatus: activity.status,
          communicationStatus: activity.communicationStatus,
          recordSource: activity.recordSource,
          assignedToUserId: activity.assignedToUserId,
          dueAt: activity.dueAt?.toISOString() ?? null,
          completedAt: activity.completedAt?.toISOString() ?? null,
          outcome: activity.outcome,
          durationSeconds: activity.durationSeconds,
          location: activity.location,
          attendees: activity.attendees,
          externalMessageId: activity.externalMessageId,
          externalThreadId: activity.externalThreadId,
          providerKey: activity.providerKey,
          errorCode: activity.errorCode,
          errorMessage: activity.errorMessage,
        },
      };
    });

    let stageTransitionItems: TimelineItem[] = [];
    if (entityType === "deal") {
      const transitions = await this.prisma.dealStageTransition.findMany({
        where: { tenantId, dealId: entityId },
        orderBy: { transitionedAt: "desc" },
        take: pageSize,
      });

      stageTransitionItems = transitions.map((transition) => ({
        id: transition.id,
        type: "STAGE_TRANSITION" as const,
        timestamp: transition.transitionedAt,
        subject: `Moved from ${transition.fromStageId ?? "new"} to ${transition.toStageId}`,
        body: null,
        actorUserId: transition.transitionedByUserId,
        metadata: {
          fromStageId: transition.fromStageId,
          toStageId: transition.toStageId,
        },
      }));
    }

    const allItems = [...activityItems, ...stageTransitionItems].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    const items = allItems.slice(0, pageSize);
    const nextCursor = items.length === pageSize ? (items.at(-1)?.id ?? null) : null;

    return { items, nextCursor };
  }

  async upsertWebhookEvent(input: UpsertWebhookEventInput): Promise<boolean> {
    try {
      await this.prisma.communicationWebhookEvent.create({
        data: {
          tenantId: input.tenantId,
          providerKey: input.providerKey,
          channelKey: input.channelKey,
          externalMessageId: input.externalMessageId,
          eventType: input.eventType,
          eventTimestamp: input.eventTimestamp,
          payload: (toJsonInput(input.payload) ?? {}) as Prisma.InputJsonValue,
          activityId: input.activityId ?? null,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }
}
