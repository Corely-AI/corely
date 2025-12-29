import { Inject, Injectable } from "@nestjs/common";
import type { GetCurrentShiftInput, GetCurrentShiftOutput } from "@kerniflow/contracts";
import { BaseUseCase, type Context, type Result, Ok } from "@kerniflow/kernel";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";

@Injectable()
export class GetCurrentShiftUseCase extends BaseUseCase<
  GetCurrentShiftInput,
  GetCurrentShiftOutput
> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort
  ) {
    super();
  }

  async executeImpl(
    input: GetCurrentShiftInput,
    ctx: Context
  ): Promise<Result<GetCurrentShiftOutput>> {
    const session = await this.shiftRepo.findOpenByRegister(ctx.workspaceId, input.registerId);

    return Ok({
      session: session ? session.toDto() : null,
    });
  }
}
