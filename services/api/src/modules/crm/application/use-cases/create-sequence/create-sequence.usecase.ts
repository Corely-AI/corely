import { Injectable, Inject } from "@nestjs/common";
import { BaseUseCase, UseCaseContext, Result, ok, UseCaseError } from "@corely/kernel";
import { CreateSequenceInput, SequenceDto } from "@corely/contracts";
import { PrismaSequenceRepoAdapter } from "../../../infrastructure/prisma/prisma-sequence-repo.adapter";
import { SequenceAggregate } from "../../../domain/sequence.aggregate";
import { SequenceStepType } from "@prisma/client";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";

@Injectable()
export class CreateSequenceUseCase extends BaseUseCase<CreateSequenceInput, SequenceDto> {
  constructor(
    private readonly sequenceRepo: PrismaSequenceRepoAdapter,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {
    super({});
  }

  protected async handle(
    input: CreateSequenceInput,
    ctx: UseCaseContext
  ): Promise<Result<SequenceDto, UseCaseError>> {
    const sequenceId = this.idGenerator.newId();
    const now = this.clock.now();

    const steps = input.steps.map((step) => ({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      sequenceId,
      stepOrder: step.stepOrder,
      type: step.type as SequenceStepType, // Cast assuming validation ensures compatibility
      dayDelay: step.dayDelay,
      templateSubject: step.templateSubject ?? null,
      templateBody: step.templateBody ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const aggregate = new SequenceAggregate(
      sequenceId,
      ctx.tenantId,
      steps,
      input.name,
      input.description || null,
      ctx.userId || null,
      // other fields if aggregate has them? constructor signature:
      // id, tenantId, steps, name, description, ownerUserId?
    );

    // SequenceAggregate constructor:
    // public readonly id: string,
    // public readonly tenantId: string,
    // public readonly steps: SequenceStep[],
    // public readonly name: string,
    // public readonly description?: string | null,
    // public readonly ownerUserId?: string | null

    await this.sequenceRepo.create(ctx.tenantId, aggregate);

    return ok({
        id: aggregate.id,
        tenantId: aggregate.tenantId,
        name: aggregate.name,
        description: aggregate.description,
        ownerUserId: aggregate.ownerUserId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        steps: steps.map(s => ({
            id: s.id,
            tenantId: s.tenantId,
            sequenceId: s.sequenceId,
            stepOrder: s.stepOrder,
            type: s.type,
            dayDelay: s.dayDelay,
            templateSubject: s.templateSubject,
            templateBody: s.templateBody,
        }))
    });
  }
}
