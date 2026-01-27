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
} from '@corely/kernel';
import {
 type UpdateCmsPostContentInput,
 type UpdateCmsPostContentOutput,
} from '@corely/contracts';
import { type CmsPostRepositoryPort } from '../ports/cms-post-repository.port';
import { CmsContentRenderer } from '../services/cms-content-renderer.service';
import { toCmsPostDto } from '../mappers/cms.mapper';

type Deps = {
 logger: LoggerPort;
 postRepo: CmsPostRepositoryPort;
 contentRenderer: CmsContentRenderer;
 clock: ClockPort;
};

type UpdateCmsPostContentParams = UpdateCmsPostContentInput & { postId: string };

export class UpdateCmsPostContentUseCase extends BaseUseCase<
 UpdateCmsPostContentParams,
 UpdateCmsPostContentOutput
> {
 constructor(private readonly useCaseDeps: Deps) {
 super({ logger: useCaseDeps.logger });
 }

 protected async handle(
 input: UpdateCmsPostContentParams,
 ctx: UseCaseContext
 ): Promise<Result<UpdateCmsPostContentOutput, UseCaseError>> {
 if (!ctx.tenantId || !ctx.workspaceId) {
 return err(new ValidationError('tenantId or workspaceId missing from context'));
 }

 const post = await this.useCaseDeps.postRepo.findById(ctx.tenantId, input.postId);
 if (!post || post.workspaceId !== ctx.workspaceId) {
 return err(new NotFoundError('Post not found'));
 }

 const rendered = this.useCaseDeps.contentRenderer.render(input.contentJson);
 const now = this.useCaseDeps.clock.now();

 post.updateContent({
 contentJson: input.contentJson,
 contentHtml: rendered.html,
 contentText: rendered.text,
 now,
 });

 await this.useCaseDeps.postRepo.save(post);

 return ok({ post: toCmsPostDto(post) });
 }
}
