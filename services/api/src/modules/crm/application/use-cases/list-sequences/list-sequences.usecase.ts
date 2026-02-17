import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import type { SequenceDto } from "@corely/contracts";
import { SEQUENCE_REPO_PORT, type SequenceRepoPort } from "../../ports/sequence-repository.port";

type ListSequencesInput = Record<string, never>;
type ListSequencesOutput = SequenceDto[];

@Injectable()
@RequireTenant()
export class ListSequencesUseCase extends BaseUseCase<ListSequencesInput, ListSequencesOutput> {
  constructor(@Inject(SEQUENCE_REPO_PORT) private readonly sequenceRepo: SequenceRepoPort) {
    super({});
  }

  protected async handle(
    _input: ListSequencesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSequencesOutput, UseCaseError>> {
    const sequences = await this.sequenceRepo.list(ctx.tenantId);
    return ok(
      sequences.map((sequence) => ({
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
      }))
    );
  }
}
