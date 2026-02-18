import type { ActivityDto } from "@corely/contracts";
import type { ActivityEntity } from "../../domain/activity.entity";

export function toActivityDto(activity: ActivityEntity): ActivityDto {
  const base = {
    id: activity.id,
    tenantId: activity.tenantId,
    subject: activity.subject,
    body: activity.body,
    channelKey: activity.channelKey,
    direction: activity.direction,
    communicationStatus: activity.communicationStatus,
    messageDirection: activity.messageDirection,
    messageTo: activity.messageTo,
    openUrl: activity.openUrl,
    partyId: activity.partyId,
    dealId: activity.dealId,
    activityDate: activity.activityDate ? activity.activityDate.toISOString() : null,
    ownerId: activity.ownerId,
    recordSource: activity.recordSource,
    recordSourceDetails: activity.recordSourceDetails,
    to: activity.toRecipients ?? undefined,
    cc: activity.ccRecipients ?? undefined,
    participants: activity.participants ?? undefined,
    threadKey: activity.threadKey,
    externalThreadId: activity.externalThreadId,
    externalMessageId: activity.externalMessageId,
    providerKey: activity.providerKey,
    errorCode: activity.errorCode,
    errorMessage: activity.errorMessage,
    rawProviderPayload: activity.rawProviderPayload,
    attachments: activity.attachments ?? undefined,
    dueAt: activity.dueAt ? activity.dueAt.toISOString() : null,
    completedAt: activity.completedAt ? activity.completedAt.toISOString() : null,
    status: activity.status,
    outcome: activity.outcome,
    durationSeconds: activity.durationSeconds,
    location: activity.location,
    attendees: activity.attendees ?? undefined,
    metadata: activity.metadata,
    assignedToUserId: activity.assignedToUserId,
    createdByUserId: activity.createdByUserId,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };

  if (activity.type === "COMMUNICATION") {
    return {
      ...base,
      type: "COMMUNICATION",
      channelKey: activity.channelKey ?? "email",
      direction: activity.direction ?? "OUTBOUND",
      communicationStatus: activity.communicationStatus ?? "LOGGED",
    };
  }

  return {
    ...base,
    type: activity.type,
  } as ActivityDto;
}
