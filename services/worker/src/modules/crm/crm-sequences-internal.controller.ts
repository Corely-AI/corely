import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import {
  CrmSequenceExecutorService,
  type ExecuteCrmSequenceStepPayload,
} from "./crm-sequence-executor.service";

@Controller("internal/crm/sequences")
export class CrmSequencesInternalController {
  constructor(private readonly executor: CrmSequenceExecutorService) {}

  @Post("execute-step")
  async executeStep(
    @Body() body: ExecuteCrmSequenceStepPayload | undefined,
    @Headers("x-worker-key") workerKey: string
  ) {
    this.assertWorkerAuth(workerKey);

    if (!body?.enrollmentId || !body.stepId) {
      throw new BadRequestException("enrollmentId and stepId are required");
    }

    await this.executor.executeStep(body);

    return {
      ok: true,
      enrollmentId: body.enrollmentId,
      stepId: body.stepId,
    };
  }

  private assertWorkerAuth(workerKey: string) {
    const expectedKey = process.env.INTERNAL_WORKER_KEY;
    if (expectedKey && workerKey !== expectedKey) {
      throw new UnauthorizedException("Invalid worker key");
    }
  }
}
