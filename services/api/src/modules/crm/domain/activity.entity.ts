export type ActivityType = "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL_DRAFT";
export type ActivityStatus = "OPEN" | "COMPLETED" | "CANCELED";

type ActivityProps = {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  status: ActivityStatus;
  assignedToUserId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  outcome?: string | null;
  durationSeconds?: number | null;
  location?: string | null;
  attendees?: any | null; // Keep flexible as any/unknown
  metadata?: any | null;
};

export class ActivityEntity {
  id: string;
  tenantId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  channelKey: string | null;
  messageDirection: string | null;
  messageTo: string | null;
  openUrl: string | null;
  partyId: string | null;
  dealId: string | null;
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
  attendees: any | null;
  metadata: any | null;

  constructor(props: ActivityProps) {
    // Validate required fields
    if (!props.subject.trim()) {
      throw new Error("Activity subject is required");
    }

    // Validate that at least one context is provided (partyId or dealId)
    // Relaxed for now as we might have global tasks, but strict per previous logic
    if (!props.partyId && !props.dealId) {
      throw new Error("Activity must be associated with either a party or a deal");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.type = props.type;
    this.subject = props.subject;
    this.body = props.body;
    this.channelKey = props.channelKey;
    this.messageDirection = props.messageDirection;
    this.messageTo = props.messageTo;
    this.openUrl = props.openUrl;
    this.partyId = props.partyId;
    this.dealId = props.dealId;
    this.dueAt = props.dueAt;
    this.completedAt = props.completedAt;
    this.status = props.status;
    this.assignedToUserId = props.assignedToUserId;
    this.createdByUserId = props.createdByUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.outcome = props.outcome ?? null;
    this.durationSeconds = props.durationSeconds ?? null;
    this.location = props.location ?? null;
    this.attendees = props.attendees ?? null;
    this.metadata = props.metadata ?? null;
  }

  static create(params: {
    id: string;
    tenantId: string;
    type: ActivityType;
    subject: string;
    body?: string | null;
    channelKey?: string | null;
    messageDirection?: string | null;
    messageTo?: string | null;
    openUrl?: string | null;
    partyId?: string | null;
    dealId?: string | null;
    dueAt?: Date | null;
    assignedToUserId?: string | null;
    createdByUserId?: string | null;
    createdAt: Date;
    outcome?: string | null;
    durationSeconds?: number | null;
    location?: string | null;
    attendees?: any | null;
    metadata?: any | null;
  }) {
    return new ActivityEntity({
      ...params,
      body: params.body ?? null,
      channelKey: params.channelKey ?? null,
      messageDirection: params.messageDirection ?? null,
      messageTo: params.messageTo ?? null,
      openUrl: params.openUrl ?? null,
      partyId: params.partyId ?? null,
      dealId: params.dealId ?? null,
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
    }
    if (patch.outcome !== undefined) {this.outcome = patch.outcome;}
    if (patch.durationSeconds !== undefined) {this.durationSeconds = patch.durationSeconds;}
    if (patch.location !== undefined) {this.location = patch.location;}
    if (patch.attendees !== undefined) {this.attendees = patch.attendees;}
    if (patch.metadata !== undefined) {this.metadata = patch.metadata;}

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
