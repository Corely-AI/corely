import type { EnrollmentStatus, SequenceStepType } from "@prisma/client";

export const ENROLLMENT_REPO_PORT = Symbol("ENROLLMENT_REPO_PORT");

// Need to match EnrollmentWithRelations from adapter or define here
export type EnrollmentWithRelations = {
  id: string;
  tenantId: string;
  sequenceId: string;
  leadId: string | null;
  partyId: string | null;
  dealId: string | null;
  currentStepOrder: number;
  status: EnrollmentStatus;
  nextExecutionAt: Date | null;
  sequence: {
    steps: {
      stepOrder: number;
      type: SequenceStepType;
      dayDelay: number;
      templateSubject: string | null;
      templateBody: string | null;
    }[];
  };
};

export interface EnrollmentRepoPort {
  create(data: {
    id: string;
    tenantId: string;
    sequenceId: string;
    leadId?: string;
    partyId?: string;
    dealId?: string;
    status: EnrollmentStatus;
    nextExecutionAt: Date;
  }): Promise<void>;

  findDueEnrollments(limit: number): Promise<EnrollmentWithRelations[]>;

  findById(tenantId: string, id: string): Promise<EnrollmentWithRelations | null>;

  findBySequenceLeadDealContext(
    tenantId: string,
    sequenceId: string,
    leadId: string,
    dealId: string
  ): Promise<EnrollmentWithRelations | null>;

  cancelById(id: string): Promise<boolean>;

  cancelPendingByDealContext(tenantId: string, dealId: string): Promise<number>;

  updateStatus(
    id: string,
    status: EnrollmentStatus,
    nextExecutionAt: Date | null,
    currentStepOrder: number
  ): Promise<void>;
}
