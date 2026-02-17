export type EnrollmentStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELED";

type EnrollmentProps = {
  id: string;
  tenantId: string;
  sequenceId: string;
  leadId: string | null;
  partyId: string | null;
  currentStepOrder: number;
  status: EnrollmentStatus;
  nextExecutionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class EnrollmentAggregate {
  id: string;
  tenantId: string;
  sequenceId: string;
  leadId: string | null;
  partyId: string | null;
  currentStepOrder: number;
  status: EnrollmentStatus;
  nextExecutionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: EnrollmentProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.sequenceId = props.sequenceId;
    this.leadId = props.leadId;
    this.partyId = props.partyId;
    this.currentStepOrder = props.currentStepOrder;
    this.status = props.status;
    this.nextExecutionAt = props.nextExecutionAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(params: {
    id: string;
    tenantId: string;
    sequenceId: string;
    leadId?: string | null;
    partyId?: string | null;
    nextExecutionAt: Date;
    createdAt: Date;
  }) {
    // Validate that at least one entity is specified
    if (!params.leadId && !params.partyId) {
      throw new Error("Enrollment must have either leadId or partyId");
    }

    return new EnrollmentAggregate({
      id: params.id,
      tenantId: params.tenantId,
      sequenceId: params.sequenceId,
      leadId: params.leadId ?? null,
      partyId: params.partyId ?? null,
      currentStepOrder: 1, // Start at step 1
      status: "ACTIVE",
      nextExecutionAt: params.nextExecutionAt,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
    });
  }

  pause(now: Date) {
    if (this.status !== "ACTIVE") {
      throw new Error("Can only pause active enrollments");
    }
    this.status = "PAUSED";
    this.nextExecutionAt = null;
    this.updatedAt = now;
  }

  resume(nextExecutionAt: Date, now: Date) {
    if (this.status !== "PAUSED") {
      throw new Error("Can only resume paused enrollments");
    }
    this.status = "ACTIVE";
    this.nextExecutionAt = nextExecutionAt;
    this.updatedAt = now;
  }

  cancel(now: Date) {
    if (this.status === "COMPLETED" || this.status === "CANCELED") {
      throw new Error("Enrollment already ended");
    }
    this.status = "CANCELED";
    this.nextExecutionAt = null;
    this.updatedAt = now;
  }

  complete(now: Date) {
    this.status = "COMPLETED";
    this.nextExecutionAt = null;
    this.updatedAt = now;
  }

  advanceToNextStep(stepOrder: number, nextExecutionAt: Date | null, now: Date) {
    this.currentStepOrder = stepOrder;
    this.nextExecutionAt = nextExecutionAt;
    this.updatedAt = now;
  }
}
