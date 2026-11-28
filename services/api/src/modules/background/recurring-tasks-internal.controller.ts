import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Post,
  UnauthorizedException,
  UseGuards,
  type ExecutionContext,
} from "@nestjs/common";
import { EnvService } from "@corely/config";
import { z } from "zod";
import { BackgroundInternalGuard } from "./background-internal.guard";
import { RecurringGenerationUseCase } from "../tasks/public";

// Recurrence writes tasks. Unlike legacy optional-key endpoints, this route fails
// closed until the existing service token (or configured legacy key) is present.
@Injectable()
export class RecurringTasksInternalGuard extends BackgroundInternalGuard {
  constructor(private readonly config: EnvService) {
    super(config);
  }
  canActivate(context: ExecutionContext): boolean {
    if (!this.config.WORKER_API_SERVICE_TOKEN && !process.env.INTERNAL_WORKER_KEY) {
      throw new UnauthorizedException("Configure the background service token");
    }
    return super.canActivate(context);
  }
}
@Controller("internal/background/tasks/recurring")
@UseGuards(RecurringTasksInternalGuard)
export class RecurringTasksInternalController {
  constructor(private readonly generation: RecurringGenerationUseCase) {}
  @Post("run")
  run(@Body() body: unknown) {
    const parsed = z
      .object({ limit: z.number().int().min(1).max(25).default(10) })
      .strict()
      .safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid generation limit");
    }
    return this.generation.run(parsed.data.limit);
  }
}
