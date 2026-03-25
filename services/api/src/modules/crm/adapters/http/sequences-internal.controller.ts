import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { RunSequenceStepsInputSchema, RunSequenceStepsOutputSchema } from "@corely/contracts";
import { ServiceTokenGuard } from "../../../../shared/http/service-token.guard";
import { RunSequenceStepsUseCase } from "../../application/use-cases/run-sequence-steps/run-sequence-steps.usecase";
import { ExecuteSequenceStepUseCase } from "../../application/use-cases/execute-sequence-step/execute-sequence-step.usecase";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AllowSurfaces } from "@/shared/surface";
import { z } from "zod";

const ExecuteSequenceStepInputSchema = z.object({
  enrollmentId: z.string().min(1),
  stepId: z.string().min(1),
  expectedRunAt: z.string().datetime().optional(),
});

@AllowSurfaces("platform", "crm")
@Controller("internal/crm/sequences")
@UseGuards(ServiceTokenGuard)
export class SequencesInternalController {
  constructor(
    private readonly runSequenceSteps: RunSequenceStepsUseCase,
    private readonly executeSequenceStep: ExecuteSequenceStepUseCase
  ) {}

  @Post("run")
  async run(@Body() body: unknown, @Req() req: Request) {
    const input = RunSequenceStepsInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);

    // Force input type for TS if needed since defaults handling can be tricky in inference
    const result = await this.runSequenceSteps.execute(input as { limit: number }, ctx);
    return RunSequenceStepsOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("execute-step")
  async executeStep(@Body() body: unknown, @Req() req: Request) {
    const parsed = ExecuteSequenceStepInputSchema.parse(body ?? {});
    if (!parsed.enrollmentId || !parsed.stepId) {
      throw new BadRequestException("Invalid execute-step payload");
    }
    const input = {
      enrollmentId: parsed.enrollmentId,
      stepId: parsed.stepId,
      ...(parsed.expectedRunAt ? { expectedRunAt: parsed.expectedRunAt } : {}),
    };
    const ctx = buildUseCaseContext(req);
    const result = await this.executeSequenceStep.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
