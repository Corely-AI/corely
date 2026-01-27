import {
 BaseUseCase,
 type LoggerPort,
 type Result,
 type UseCaseContext,
 type UseCaseError,
 ValidationError,
 NotFoundError,
 ConflictError,
 err,
 ok,
 type ClockPort,
} from '@corely/kernel';
import { type UpdateCmsPostInput, type UpdateCmsPostOutput } from '@corely/contracts';
import { type CmsPostRepositoryPort } from '../ports/cms-post-repository.port';
import { toCmsPostDto } from '../mappers/cms.mapper';

type Deps = {
 logger: LoggerPort;
 postRepo: CmsPostRepositoryPort;
 clock: ClockPort;
};

type UpdateCmsPostParams = UpdateCmsPostInput & { postId: string };

export class UpdateCmsPostUseCase extends BaseUseCase<UpdateCmsPostParams, UpdateCmsPostOutput> {
 constructor(private readonly useCaseDeps: Deps) {
 super({ logger: useCaseDeps.logger });
 }

 protected async handle(
 input: UpdateCmsPostParams,
 ctx: UseCaseContext
 ): Promise<Result<UpdateCmsPostOutput, UseCaseError>> {
 if (!ctx.tenantId || !ctx.workspaceId) {
 return err(new ValidationError('tenantId or workspaceId missing from context'));
 }

 const post = await this.useCaseDeps.postRepo.findById(ctx.tenantId, input.postId);
 if (!post || post.workspaceId !== ctx.workspaceId) {
 return err(new NotFoundError('Post not found'));
 }

 if (input.status === 'PUBLISHED') {
 return err(new ValidationError('Use publish endpoint to publish posts'));
 }

 const nextSlug = input.slug?.trim();
 if (nextSlug && nextSlug !== post.slug) {
 const existing = await this.useCaseDeps.postRepo.findBySlug(
 ctx.tenantId,
 nextSlug
 );
 if (existing && existing.id !== post.id) {
 return err(new ConflictError('slug already exists'));
 }
 }

 const now = this.useCaseDeps.clock.now();
 const excerpt = Object.prototype.hasOwnProperty.call(input, 'excerpt')
 ? input.excerpt ?? null
 : undefined;
 const coverImageFileId = Object.prototype.hasOwnProperty.call(input, 'coverImageFileId')
 ? input.coverImageFileId ?? null
 : undefined;

 post.updateMeta({
 title: input.title?.trim(),
 slug: nextSlug,
 excerpt,
 coverImageFileId,
 status: input.status,
 now,
 });

 await this.useCaseDeps.postRepo.save(post);

 return ok({ post: toCmsPostDto(post) });
 }
}
