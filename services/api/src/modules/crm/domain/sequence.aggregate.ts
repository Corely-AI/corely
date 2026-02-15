import { type Sequence, type SequenceStep, SequenceStepType } from "@prisma/client";

export class SequenceAggregate {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly steps: SequenceStep[],
    public readonly name: string,
    public readonly description?: string | null,
    public readonly ownerUserId?: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static from(model: Sequence & { steps: SequenceStep[] }): SequenceAggregate {
    return new SequenceAggregate(
      model.id,
      model.tenantId,
      model.steps.sort((a, b) => a.stepOrder - b.stepOrder),
      model.name,
      model.description,
      model.ownerUserId,
      model.createdAt,
      model.updatedAt
    );
  }

  getStepByOrder(order: number): SequenceStep | undefined {
    return this.steps.find((s) => s.stepOrder === order);
  }

  isLastStep(order: number): boolean {
    const lastStep = this.steps[this.steps.length - 1];
    return lastStep ? lastStep.stepOrder === order : true;
  }
}
