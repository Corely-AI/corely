import { Body, Controller, Header, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { AnswerKnowledgeQuestionUseCase } from "../../application/use-cases/answer-knowledge-question.usecase";

@Controller("copilot/knowledge")
@UseGuards(AuthGuard)
export class KnowledgeQuestionController {
  constructor(
    @Inject(AnswerKnowledgeQuestionUseCase) private readonly answer: AnswerKnowledgeQuestionUseCase
  ) {}

  @Post("answer")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  ask(@Body() input: unknown, @Req() request: ContextAwareRequest) {
    return this.answer.execute(input, toUseCaseContext(request));
  }
}
