import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { SequenceDto } from "@corely/contracts";
import { SEQUENCE_REPO_PORT, type SequenceRepoPort } from "../../ports/sequence-repository.port";
import type { SequenceAggregate } from "../../../domain/sequence.aggregate";

type GetSequenceByIdInput = {
  id: string;
};

@Injectable()
@RequireTenant()
export class GetSequenceByIdUseCase extends BaseUseCase<GetSequenceByIdInput, SequenceDto> {
  constructor(@Inject(SEQUENCE_REPO_PORT) private readonly sequenceRepo: SequenceRepoPort) {
    super({});
  }

  protected async handle(
    input: GetSequenceByIdInput,
    ctx: UseCaseContext
  ): Promise<Result<SequenceDto, UseCaseError>> {
    const sequence = await this.sequenceRepo.findById(ctx.tenantId, input.id);
    if (!sequence) {
      return err(new NotFoundError("Sequence not found"));
    }

    return ok(this.toDto(sequence));
  }

  private toDto(sequence: SequenceAggregate): SequenceDto {
    return {
      id: sequence.id,
      tenantId: sequence.tenantId,
      name: sequence.name,
      description: sequence.description ?? null,
      ownerUserId: sequence.ownerUserId ?? null,
      createdAt: (sequence.createdAt ?? new Date()).toISOString(),
      updatedAt: (sequence.updatedAt ?? sequence.createdAt ?? new Date()).toISOString(),
      steps: sequence.steps.map((step) => ({
        id: step.id,
        tenantId: step.tenantId,
        sequenceId: step.sequenceId,
        stepOrder: step.stepOrder,
        type: step.type,
        dayDelay: step.dayDelay,
        templateSubject: step.templateSubject,
        templateBody: step.templateBody,
      })),
    };
  }
}
