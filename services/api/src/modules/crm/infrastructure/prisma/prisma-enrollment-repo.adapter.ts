import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { EnrollmentStatus, SequenceEnrollment } from "@prisma/client";

export type EnrollmentWithRelations = SequenceEnrollment & {
  sequence: {
    steps: {
      stepOrder: number;
      type: "EMAIL_AUTO" | "EMAIL_MANUAL" | "CALL" | "TASK";
      dayDelay: number;
      templateSubject: string | null;
      templateBody: string | null;
    }[];
  };
};

@Injectable()
export class PrismaEnrollmentRepoAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    tenantId: string;
    sequenceId: string;
    leadId?: string;
    partyId?: string;
    status: EnrollmentStatus;
    nextExecutionAt: Date;
  }): Promise<void> {
    await this.prisma.sequenceEnrollment.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        sequenceId: data.sequenceId,
        leadId: data.leadId,
        partyId: data.partyId,
        status: data.status,
        nextExecutionAt: data.nextExecutionAt,
      },
    });
  }

  async findDueEnrollments(limit = 10): Promise<EnrollmentWithRelations[]> {
    return this.prisma.sequenceEnrollment.findMany({
      where: {
        status: "ACTIVE",
        nextExecutionAt: { lte: new Date() },
      },
      include: {
        sequence: {
          include: {
            steps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
      orderBy: { nextExecutionAt: "asc" },
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    status: EnrollmentStatus,
    nextExecutionAt: Date | null,
    currentStepOrder: number
  ): Promise<void> {
    await this.prisma.sequenceEnrollment.update({
      where: { id },
      data: {
        status,
        nextExecutionAt,
        currentStepOrder,
      },
    });
  }
}
