import {
  type ActivityEntity,
  type ActivityStatus,
  type ActivityType,
  type CommunicationDirection,
  type CommunicationStatus,
} from "../../domain/activity.entity";

export type ListActivitiesFilters = {
  partyId?: string;
  dealId?: string;
  assignedToUserId?: string;
  status?: ActivityStatus;
  type?: ActivityType;
  channelKey?: string;
  direction?: CommunicationDirection;
  communicationStatus?: CommunicationStatus;
  activityDateFrom?: Date;
  activityDateTo?: Date;
};

export type ListActivitiesResult = {
  items: ActivityEntity[];
  nextCursor?: string | null;
};

export type TimelineItem = {
  id: string;
  type: "ACTIVITY" | "STAGE_TRANSITION" | "NOTE" | "MESSAGE";
  timestamp: Date;
  subject: string;
  body: string | null;
  actorUserId: string | null;
  channelKey?: string;
  direction?: string;
  status?: CommunicationStatus;
  to?: string;
  threadKey?: string;
  openUrl?: string;
  metadata?: Record<string, unknown>;
};

export type UpsertWebhookEventInput = {
  tenantId: string;
  providerKey: string;
  channelKey: string;
  externalMessageId: string;
  eventType: string;
  eventTimestamp: Date;
  payload: Record<string, unknown>;
  activityId?: string;
};

export type TimelineResult = {
  items: TimelineItem[];
  nextCursor?: string | null;
};

export interface ActivityRepoPort {
  findById(tenantId: string, activityId: string): Promise<ActivityEntity | null>;
  list(
    tenantId: string,
    filters: ListActivitiesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListActivitiesResult>;
  create(tenantId: string, activity: ActivityEntity): Promise<void>;
  update(tenantId: string, activity: ActivityEntity): Promise<void>;
  getTimeline(
    tenantId: string,
    entityType: "party" | "deal",
    entityId: string,
    pageSize?: number,
    cursor?: string
  ): Promise<TimelineResult>;
  findCommunicationByExternalMessageId(
    tenantId: string,
    providerKey: string,
    externalMessageId: string
  ): Promise<ActivityEntity | null>;
  upsertWebhookEvent(input: UpsertWebhookEventInput): Promise<boolean>;
}

export const ACTIVITY_REPO_PORT = "crm/activity-repository";
