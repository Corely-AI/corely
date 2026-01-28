import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  type ClockPort,
} from "@corely/kernel";
import {
  type UpdateCmsCommentStatusInput,
  type UpdateCmsCommentStatusOutput,
} from "@corely/contracts";
import { type CmsCommentRepositoryPort } from "../ports/cms-comment-repository.port";
import { toCmsCommentDto } from "../mappers/cms.mapper";

type Deps = {
  logger: LoggerPort;
  commentRepo: CmsCommentRepositoryPort;
  clock: ClockPort;
};

type ModerateCmsCommentParams = UpdateCmsCommentStatusInput & { commentId: string };

export class ModerateCmsCommentUseCase extends BaseUseCase<
  ModerateCmsCommentParams,
  UpdateCmsCommentStatusOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ModerateCmsCommentParams,
    ctx: UseCaseContext
  ): Promise<Result<UpdateCmsCommentStatusOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const comment = await this.useCaseDeps.commentRepo.findById(ctx.tenantId, input.commentId);
    if (!comment || comment.workspaceId !== ctx.workspaceId) {
      return err(new NotFoundError("Comment not found"));
    }

    comment.moderate(input.status, this.useCaseDeps.clock.now());
    await this.useCaseDeps.commentRepo.save(comment);

    return ok({ comment: toCmsCommentDto(comment) });
  }
}
