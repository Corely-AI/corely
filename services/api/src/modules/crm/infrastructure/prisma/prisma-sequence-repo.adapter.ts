import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { SequenceAggregate } from "../../domain/sequence.aggregate";
import type { SequenceRepoPort } from "../../application/ports/sequence-repository.port";

@Injectable()
export class PrismaSequenceRepoAdapter implements SequenceRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<SequenceAggregate | null> {
    const sequence = await this.prisma.sequence.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!sequence || sequence.tenantId !== tenantId) {
      return null;
    }

    return SequenceAggregate.from(sequence);
  }

  async create(tenantId: string, aggregate: SequenceAggregate): Promise<void> {
    await this.prisma.sequence.create({
      data: {
        id: aggregate.id,
        tenantId: aggregate.tenantId,
        name: aggregate.name,
        description: aggregate.description,
        ownerUserId: aggregate.ownerUserId,
        steps: {
          createMany: {
            data: aggregate.steps.map((s) => ({
              id: s.id,
              stepOrder: s.stepOrder,
              type: s.type,
              dayDelay: s.dayDelay,
              templateSubject: s.templateSubject,
              templateBody: s.templateBody,
              tenantId: aggregate.tenantId,
            })),
          },
        },
      },
    });
  }

  async list(tenantId: string): Promise<SequenceAggregate[]> {
    const sequences = await this.prisma.sequence.findMany({
      where: { tenantId },
      include: { steps: true },
    });
    return sequences.map(SequenceAggregate.from);
  }
}
