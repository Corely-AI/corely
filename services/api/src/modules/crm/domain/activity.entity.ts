export type ActivityType = "NOTE" | "TASK" | "CALL" | "MEETING" | "COMMUNICATION" | "SYSTEM_EVENT";
export type ActivityStatus = "OPEN" | "COMPLETED" | "CANCELED";
export type CommunicationDirection = "INBOUND" | "OUTBOUND";
export type CommunicationStatus =
  | "LOGGED"
  | "DRAFT"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";
export type ActivityRecordSource = "MANUAL" | "SYSTEM" | "INTEGRATION";

type ActivityProps = {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  direction: CommunicationDirection | null;
  communicationStatus: CommunicationStatus | null;
  messageDirection: string | null; // deprecated alias
  messageTo: string | null; // deprecated alias
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  activityDate: Date | null;
  ownerId: string | null;
  recordSource: ActivityRecordSource | null;
  recordSourceDetails: Record<string, unknown> | null;
  toRecipients: string[] | null;
  ccRecipients: string[] | null;
  participants: string[] | null;
  threadKey: string | null;
  externalThreadId: string | null;
  externalMessageId: string | null;
  providerKey: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawProviderPayload: Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>> | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: ActivityStatus;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  outcome: string | null;
  durationSeconds: number | null;
  location: string | null;
  attendees: unknown[] | null;
  metadata: Record<string, unknown> | null;
};

export class ActivityEntity {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  direction: CommunicationDirection | null;
  communicationStatus: CommunicationStatus | null;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  activityDate: Date | null;
  ownerId: string | null;
  recordSource: ActivityRecordSource | null;
  recordSourceDetails: Record<string, unknown> | null;
  toRecipients: string[] | null;
  ccRecipients: string[] | null;
  participants: string[] | null;
  threadKey: string | null;
  externalThreadId: string | null;
  externalMessageId: string | null;
  providerKey: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  rawProviderPayload: Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>> | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: ActivityStatus;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  outcome: string | null;
  durationSeconds: number | null;
  location: string | null;
  attendees: unknown[] | null;
  metadata: Record<string, unknown> | null;

  constructor(props: ActivityProps) {
    if (!props.subject.trim()) {
      throw new Error("Activity subject is required");
    }
    if (!props.partyId && !props.dealId) {
      throw new Error("Activity must be associated with either a party or a deal");
    }
    if (props.type === "COMMUNICATION") {
      if (!props.channelKey) {
        throw new Error("Communication activity requires channelKey");
      }
      if (!props.direction) {
        throw new Error("Communication activity requires direction");
      }
      if (!props.communicationStatus) {
        throw new Error("Communication activity requires communicationStatus");
      }
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.type = props.type;
    this.subject = props.subject;
    this.body = props.body;
    this.channelKey = props.channelKey;
    this.direction = props.direction;
    this.communicationStatus = props.communicationStatus;
    this.messageDirection = props.messageDirection;
    this.messageTo = props.messageTo;
    this.openUrl = props.openUrl;
    this.partyId = props.partyId;
    this.dealId = props.dealId;
    this.activityDate = props.activityDate;
    this.ownerId = props.ownerId;
    this.recordSource = props.recordSource;
    this.recordSourceDetails = props.recordSourceDetails;
    this.toRecipients = props.toRecipients;
    this.ccRecipients = props.ccRecipients;
    this.participants = props.participants;
    this.threadKey = props.threadKey;
    this.externalThreadId = props.externalThreadId;
    this.externalMessageId = props.externalMessageId;
    this.providerKey = props.providerKey;
    this.errorCode = props.errorCode;
    this.errorMessage = props.errorMessage;
    this.rawProviderPayload = props.rawProviderPayload;
    this.attachments = props.attachments;
    this.dueAt = props.dueAt;
    this.completedAt = props.completedAt;
    this.status = props.status;
    this.assignedToUserId = props.assignedToUserId;
    this.createdByUserId = props.createdByUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.outcome = props.outcome;
    this.durationSeconds = props.durationSeconds;
    this.location = props.location;
    this.attendees = props.attendees;
    this.metadata = props.metadata;
  }

  static create(params: {
    id: string;
    tenantId: string;
    type: ActivityType;
    subject: string;
    body?: string | null;
    channelKey?: string | null;
    direction?: CommunicationDirection | null;
    communicationStatus?: CommunicationStatus | null;
    messageDirection?: string | null;
    messageTo?: string | null;
    openUrl?: string | null;
    partyId?: string | null;
    dealId?: string | null;
    activityDate?: Date | null;
    ownerId?: string | null;
    recordSource?: ActivityRecordSource | null;
    recordSourceDetails?: Record<string, unknown> | null;
    toRecipients?: string[] | null;
    ccRecipients?: string[] | null;
    participants?: string[] | null;
    threadKey?: string | null;
    externalThreadId?: string | null;
    externalMessageId?: string | null;
    providerKey?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    rawProviderPayload?: Record<string, unknown> | null;
    attachments?: Array<Record<string, unknown>> | null;
    dueAt?: Date | null;
    assignedToUserId?: string | null;
    createdByUserId?: string | null;
    createdAt: Date;
    outcome?: string | null;
    durationSeconds?: number | null;
    location?: string | null;
    attendees?: unknown[] | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return new ActivityEntity({
      ...params,
      body: params.body ?? null,
      channelKey: params.channelKey ?? null,
      direction: params.direction ?? null,
      communicationStatus: params.communicationStatus ?? null,
      messageDirection: params.messageDirection ?? params.direction?.toLowerCase() ?? null,
      messageTo: params.messageTo ?? params.toRecipients?.at(0) ?? null,
      openUrl: params.openUrl ?? null,
      partyId: params.partyId ?? null,
      dealId: params.dealId ?? null,
      activityDate: params.activityDate ?? params.createdAt,
      ownerId: params.ownerId ?? params.assignedToUserId ?? null,
      recordSource: params.recordSource ?? "MANUAL",
      recordSourceDetails: params.recordSourceDetails ?? null,
      toRecipients: params.toRecipients ?? null,
      ccRecipients: params.ccRecipients ?? null,
      participants: params.participants ?? null,
      threadKey: params.threadKey ?? null,
      externalThreadId: params.externalThreadId ?? null,
      externalMessageId: params.externalMessageId ?? null,
      providerKey: params.providerKey ?? null,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      rawProviderPayload: params.rawProviderPayload ?? null,
      attachments: params.attachments ?? null,
      dueAt: params.dueAt ?? null,
      assignedToUserId: params.assignedToUserId ?? null,
      createdByUserId: params.createdByUserId ?? null,
      status: "OPEN",
      completedAt: null,
      updatedAt: params.createdAt,
      outcome: params.outcome ?? null,
      durationSeconds: params.durationSeconds ?? null,
      location: params.location ?? null,
      attendees: params.attendees ?? null,
      metadata: params.metadata ?? null,
    });
  }

  updateActivity(
    patch: Partial<
      Pick<
        ActivityProps,
        | "subject"
        | "body"
        | "dueAt"
        | "assignedToUserId"
        | "outcome"
        | "durationSeconds"
        | "location"
        | "attendees"
        | "channelKey"
        | "direction"
        | "communicationStatus"
        | "toRecipients"
        | "ccRecipients"
        | "participants"
        | "threadKey"
        | "externalThreadId"
        | "externalMessageId"
        | "providerKey"
        | "errorCode"
        | "errorMessage"
        | "rawProviderPayload"
        | "activityDate"
        | "metadata"
      >
    >,
    now: Date
  ) {
    if (this.status === "COMPLETED") {
      throw new Error("Cannot update a completed activity");
    }
    if (this.status === "CANCELED") {
      throw new Error("Cannot update a canceled activity");
    }

    if (patch.subject !== undefined) {
      if (!patch.subject.trim()) {
        throw new Error("Activity subject cannot be empty");
      }
      this.subject = patch.subject;
    }
    if (patch.body !== undefined) {
      this.body = patch.body;
    }
    if (patch.dueAt !== undefined) {
      this.dueAt = patch.dueAt;
    }
    if (patch.assignedToUserId !== undefined) {
      this.assignedToUserId = patch.assignedToUserId;
      this.ownerId = patch.assignedToUserId;
    }
    if (patch.outcome !== undefined) {
      this.outcome = patch.outcome;
    }
    if (patch.durationSeconds !== undefined) {
      this.durationSeconds = patch.durationSeconds;
    }
    if (patch.location !== undefined) {
      this.location = patch.location;
    }
    if (patch.attendees !== undefined) {
      this.attendees = patch.attendees;
    }
    if (patch.channelKey !== undefined) {
      this.channelKey = patch.channelKey;
    }
    if (patch.direction !== undefined) {
      this.direction = patch.direction;
      this.messageDirection = patch.direction ? patch.direction.toLowerCase() : null;
    }
    if (patch.communicationStatus !== undefined) {
      this.communicationStatus = patch.communicationStatus;
    }
    if (patch.toRecipients !== undefined) {
      this.toRecipients = patch.toRecipients;
      this.messageTo = patch.toRecipients?.at(0) ?? null;
    }
    if (patch.ccRecipients !== undefined) {
      this.ccRecipients = patch.ccRecipients;
    }
    if (patch.participants !== undefined) {
      this.participants = patch.participants;
    }
    if (patch.threadKey !== undefined) {
      this.threadKey = patch.threadKey;
    }
    if (patch.externalThreadId !== undefined) {
      this.externalThreadId = patch.externalThreadId;
    }
    if (patch.externalMessageId !== undefined) {
      this.externalMessageId = patch.externalMessageId;
    }
    if (patch.providerKey !== undefined) {
      this.providerKey = patch.providerKey;
    }
    if (patch.errorCode !== undefined) {
      this.errorCode = patch.errorCode;
    }
    if (patch.errorMessage !== undefined) {
      this.errorMessage = patch.errorMessage;
    }
    if (patch.rawProviderPayload !== undefined) {
      this.rawProviderPayload = patch.rawProviderPayload;
    }
    if (patch.activityDate !== undefined) {
      this.activityDate = patch.activityDate;
    }
    if (patch.metadata !== undefined) {
      this.metadata = patch.metadata;
    }

    this.touch(now);
  }

  setCommunicationStatus(
    status: CommunicationStatus,
    now: Date,
    options?: {
      providerKey?: string | null;
      externalMessageId?: string | null;
      externalThreadId?: string | null;
      errorCode?: string | null;
      errorMessage?: string | null;
      rawProviderPayload?: Record<string, unknown> | null;
    }
  ) {
    if (this.type !== "COMMUNICATION") {
      throw new Error("Only communication activities can have communication status");
    }
    this.communicationStatus = status;
    if (options) {
      if (options.providerKey !== undefined) {
        this.providerKey = options.providerKey;
      }
      if (options.externalMessageId !== undefined) {
        this.externalMessageId = options.externalMessageId;
      }
      if (options.externalThreadId !== undefined) {
        this.externalThreadId = options.externalThreadId;
      }
      if (options.errorCode !== undefined) {
        this.errorCode = options.errorCode;
      }
      if (options.errorMessage !== undefined) {
        this.errorMessage = options.errorMessage;
      }
      if (options.rawProviderPayload !== undefined) {
        this.rawProviderPayload = options.rawProviderPayload;
      }
    }
    this.touch(now);
  }

  complete(completedAt: Date, now: Date) {
    if (this.status === "COMPLETED") {
      throw new Error("Activity is already completed");
    }
    if (this.status === "CANCELED") {
      throw new Error("Cannot complete a canceled activity");
    }

    this.status = "COMPLETED";
    this.completedAt = completedAt;
    this.touch(now);
  }

  cancel(now: Date) {
    if (this.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed activity");
    }
    if (this.status === "CANCELED") {
      throw new Error("Activity is already canceled");
    }

    this.status = "CANCELED";
    this.touch(now);
  }

  reopen(now: Date) {
    if (this.status === "OPEN") {
      throw new Error("Activity is already open");
    }

    this.status = "OPEN";
    this.completedAt = null;
    this.touch(now);
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
