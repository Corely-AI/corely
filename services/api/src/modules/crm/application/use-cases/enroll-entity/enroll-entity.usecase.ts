import { Injectable } from "@nestjs/common";
import { BaseUseCase, ok, Result, UseCaseContext, RequireTenant, IdGeneratorPort, ClockPort, UseCaseError } from "@corely/kernel";
import { EnrollEntityInput } from "@corely/contracts";
import { PrismaEnrollmentRepoAdapter } from "../../../infrastructure/prisma/prisma-enrollment-repo.adapter";
import { PrismaSequenceRepoAdapter } from "../../../infrastructure/prisma/prisma-sequence-repo.adapter";

@Injectable()
@RequireTenant()
export class EnrollEntityUseCase extends BaseUseCase<EnrollEntityInput, { enrollmentId: string }> {
  constructor(
    private readonly enrollmentRepo: PrismaEnrollmentRepoAdapter,
    private readonly sequenceRepo: PrismaSequenceRepoAdapter,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {
    super();
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
