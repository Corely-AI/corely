import { Injectable, Inject } from "@nestjs/common";
import { BaseUseCase, ok, Result, UseCaseContext, RequireTenant, UseCaseError } from "@corely/kernel";
import { EnrollEntityInput } from "@corely/contracts";
import { PrismaEnrollmentRepoAdapter } from "../../../infrastructure/prisma/prisma-enrollment-repo.adapter";
import { PrismaSequenceRepoAdapter } from "../../../infrastructure/prisma/prisma-sequence-repo.adapter";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "../../../../../shared/ports/id-generator.port";
import { NestLoggerAdapter } from "../../../../../shared/adapters/logger/nest-logger.adapter";

@Injectable()
@RequireTenant()
export class EnrollEntityUseCase extends BaseUseCase<EnrollEntityInput, { enrollmentId: string }> {
  constructor(
    private readonly enrollmentRepo: PrismaEnrollmentRepoAdapter,
    private readonly sequenceRepo: PrismaSequenceRepoAdapter,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {
    super({ logger: new NestLoggerAdapter() });
  }

  protected async handle(
    input: EnrollEntityInput,
    ctx: UseCaseContext
  ): Promise<Result<{ enrollmentId: string }, UseCaseError>> {
    const sequence = await this.sequenceRepo.findById(ctx.tenantId, input.sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${input.sequenceId} not found`);
    }

    const firstStep = sequence.getStepByOrder(1);
    const dayDelay = firstStep?.dayDelay ?? 0;
    
    // Calculate next execution time
    const nextExecutionAt = new Date(this.clock.now());
    nextExecutionAt.setDate(nextExecutionAt.getDate() + dayDelay);

    const enrollmentId = this.idGenerator.newId();

    await this.enrollmentRepo.create({
      id: enrollmentId,
      tenantId: ctx.tenantId,
      sequenceId: input.sequenceId,
      leadId: input.entityType === "lead" ? input.entityId : undefined,
      partyId: input.entityType === "party" ? input.entityId : undefined,
      status: "ACTIVE",
      nextExecutionAt,
    });

    return ok({ enrollmentId });
  }
}
