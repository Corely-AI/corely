import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { PrivateResponseInterceptor } from "../../../../shared/http/private-response.interceptor";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { OperationsBriefingUseCase } from "../../application/use-cases/operations-briefing.usecase";

@Controller("operations/today/briefing")
@UseGuards(AuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class OperationsBriefingController {
  constructor(
    @Inject(OperationsBriefingUseCase) private readonly briefing: OperationsBriefingUseCase
  ) {}

  @Post()
  @HttpCode(200)
  generate(@Req() request: ContextAwareRequest) {
    return this.briefing.execute(toUseCaseContext(request));
  }

  @Post("feedback")
  @HttpCode(204)
  feedback(@Body() body: unknown, @Req() request: ContextAwareRequest) {
    return this.briefing.feedback(body, toUseCaseContext(request));
  }
}
