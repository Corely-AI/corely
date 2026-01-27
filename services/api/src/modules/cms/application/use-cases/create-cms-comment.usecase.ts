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
  type IdGeneratorPort,
} from "@corely/kernel";
import { type CreateCmsCommentInput, type CreateCmsCommentOutput } from "@corely/contracts";
import { CmsCommentEntity } from "../../domain/cms-comment.entity";
import { type CmsCommentRepositoryPort } from "../ports/cms-comment-repository.port";
import { type CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import { type CmsReaderRepositoryPort } from "../ports/cms-reader-repository.port";
import { toCmsCommentDto } from "../mappers/cms.mapper";

type Deps = {
  logger: LoggerPort;
  commentRepo: CmsCommentRepositoryPort;
  postRepo: CmsPostRepositoryPort;
  readerRepo: CmsReaderRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

type CreateCmsCommentParams = CreateCmsCommentInput & { slug: string; readerId: string };

export class CreateCmsCommentUseCase extends BaseUseCase<
  CreateCmsCommentParams,
  CreateCmsCommentOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateCmsCommentParams): CreateCmsCommentParams {
    if (!input.bodyText?.trim()) {
      throw new ValidationError("bodyText is required");
    }
    return input;
  }

  protected async handle(
    input: CreateCmsCommentParams,
    ctx: UseCaseContext
  ): Promise<Result<CreateCmsCommentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const post = await this.useCaseDeps.postRepo.findBySlug(ctx.tenantId, input.slug, {
      publishedOnly: true,
    });
    if (!post || post.workspaceId !== ctx.workspaceId) {
      return err(new NotFoundError("Post not found"));
    }

    const reader = await this.useCaseDeps.readerRepo.findById(ctx.tenantId, input.readerId);
    if (!reader || reader.workspaceId !== ctx.workspaceId) {
      return err(new ValidationError("Reader not found"));
    }

    if (input.parentId) {
      const parent = await this.useCaseDeps.commentRepo.findById(ctx.tenantId, input.parentId);
      if (!parent || parent.postId !== post.id || parent.workspaceId !== ctx.workspaceId) {
        return err(new ValidationError("Invalid parent comment"));
      }
    }

    const now = this.useCaseDeps.clock.now();
    const comment = CmsCommentEntity.create({
      id: this.useCaseDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      postId: post.id,
      readerId: reader.id,
      parentId: input.parentId ?? null,
      bodyText: input.bodyText.trim(),
      status: "PENDING",
      readerDisplayName: reader.displayName ?? null,
      createdAt: now,
    });

    await this.useCaseDeps.commentRepo.create(comment);

    return ok({ comment: toCmsCommentDto(comment) });
  }
}
