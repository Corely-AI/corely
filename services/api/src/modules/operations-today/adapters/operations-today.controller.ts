import { Controller, Get, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { PrivateResponseInterceptor } from "../../../shared/http/private-response.interceptor";
import { toUseCaseContext, type ContextAwareRequest } from "../../../shared/request-context";
import { OperationsTodayUseCase } from "../application/operations-today.usecase";

@Controller("operations/today")
@UseGuards(AuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class OperationsTodayController {
  constructor(private readonly today: OperationsTodayUseCase) {}

  @Get()
  get(@Req() request: ContextAwareRequest) {
    return this.today.execute(toUseCaseContext(request));
  }
}
