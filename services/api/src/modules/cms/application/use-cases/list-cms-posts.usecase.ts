import {
 BaseUseCase,
 type LoggerPort,
 type Result,
 type UseCaseContext,
 type UseCaseError,
 ValidationError,
 err,
 ok,
} from '@corely/kernel';
import { type ListCmsPostsInput, type ListCmsPostsOutput } from '@corely/contracts';
import { type CmsPostRepositoryPort } from '../ports/cms-post-repository.port';
import { toCmsPostSummaryDto } from '../mappers/cms.mapper';
import { buildPageInfo } from '../../../shared/http/pagination';

type Deps = {
 logger: LoggerPort;
 postRepo: CmsPostRepositoryPort;
};

export class ListCmsPostsUseCase extends BaseUseCase<ListCmsPostsInput, ListCmsPostsOutput> {
 constructor(private readonly useCaseDeps: Deps) {
 super({ logger: useCaseDeps.logger });
 }

 protected async handle(
 input: ListCmsPostsInput,
 ctx: UseCaseContext
 ): Promise<Result<ListCmsPostsOutput, UseCaseError>> {
 if (!ctx.tenantId || !ctx.workspaceId) {
 return err(new ValidationError('tenantId or workspaceId missing from context'));
 }

 const page = input.page ?? 1;
 const pageSize = input.pageSize ?? 20;

 const { items, total } = await this.useCaseDeps.postRepo.list({
 tenantId: ctx.tenantId,
 workspaceId: ctx.workspaceId,
 status: input.status,
 q: input.q,
 page,
 pageSize,
 });

 return ok({
 items: items.map(toCmsPostSummaryDto),
 pageInfo: buildPageInfo(total, page, pageSize),
 });
 }
}
