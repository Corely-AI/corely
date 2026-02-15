import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { 
    RunSequenceStepsInputSchema, 
    RunSequenceStepsOutputSchema 
} from "@corely/contracts";
import { ServiceTokenGuard } from "../../../../shared/http/service-token.guard";
import { RunSequenceStepsUseCase } from "../../application/use-cases/run-sequence-steps/run-sequence-steps.usecase";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";

@Controller("internal/crm/sequences")
@UseGuards(ServiceTokenGuard)
export class SequencesInternalController {
  constructor(private readonly runSequenceSteps: RunSequenceStepsUseCase) {}

  @Post("run")
  async run(@Body() body: unknown, @Req() req: Request) {
    const input = RunSequenceStepsInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    
    // Force input type for TS if needed since defaults handling can be tricky in inference
    const result = await this.runSequenceSteps.execute(input as { limit: number }, ctx);
    
    if (!result.ok) {
        const httpResult = mapResultToHttp(result);
        throw httpResult.error; // Or return error response
    }
    
    return RunSequenceStepsOutputSchema.parse(result.value);
  }
}
