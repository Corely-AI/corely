import { Module } from '@nestjs/common';
import { EnvService } from '@corely/config';
import { KernelModule } from '../../shared/kernel/kernel.module';
import { IdentityModule } from '../identity';
import { PromptModule } from '../../shared/prompts/prompt.module';
import { NestLoggerAdapter } from '../../shared/adapters/logger/nest-logger.adapter';
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from '../../shared/ports/id-generator.port';
import { CLOCK_PORT_TOKEN, type ClockPort } from '../../shared/ports/clock.port';
import { CmsPostsController } from './adapters/http/cms-posts.controller';
import { CmsCommentsController } from './adapters/http/cms-comments.controller';
import { CmsPublicController } from './adapters/http/cms-public.controller';
import { CmsAuthController } from './adapters/http/cms-auth.controller';
import { CmsAiController } from './adapters/http/cms-ai.controller';
import { CmsReaderAuthGuard } from './adapters/http/cms-reader-auth.guard';
import { CmsApplication } from './application/cms.application';
import { CmsContentRenderer } from './application/services/cms-content-renderer.service';
import { PrismaCmsPostRepository } from './infrastructure/prisma/prisma-cms-post-repository.adapter';
import { PrismaCmsCommentRepository } from './infrastructure/prisma/prisma-cms-comment-repository.adapter';
import { PrismaCmsReaderRepository } from './infrastructure/prisma/prisma-cms-reader-repository.adapter';
import { CmsReaderTokenService } from './infrastructure/security/cms-reader-token.service';
import { CreateCmsPostUseCase } from './application/use-cases/create-cms-post.usecase';
import { UpdateCmsPostUseCase } from './application/use-cases/update-cms-post.usecase';
import { UpdateCmsPostContentUseCase } from './application/use-cases/update-cms-post-content.usecase';
import { PublishCmsPostUseCase } from './application/use-cases/publish-cms-post.usecase';
import { UnpublishCmsPostUseCase } from './application/use-cases/unpublish-cms-post.usecase';
import { ListCmsPostsUseCase } from './application/use-cases/list-cms-posts.usecase';
import { GetCmsPostUseCase } from './application/use-cases/get-cms-post.usecase';
import { ListPublicCmsPostsUseCase } from './application/use-cases/list-public-cms-posts.usecase';
import { GetPublicCmsPostUseCase } from './application/use-cases/get-public-cms-post.usecase';
import { ListCmsCommentsUseCase } from './application/use-cases/list-cms-comments.usecase';
import { ListPublicCmsCommentsUseCase } from './application/use-cases/list-public-cms-comments.usecase';
import { CreateCmsCommentUseCase } from './application/use-cases/create-cms-comment.usecase';
import { ModerateCmsCommentUseCase } from './application/use-cases/moderate-cms-comment.usecase';
import { SignUpCmsReaderUseCase } from './application/use-cases/sign-up-cms-reader.usecase';
import { SignInCmsReaderUseCase } from './application/use-cases/sign-in-cms-reader.usecase';
import { GenerateCmsDraftUseCase } from './application/use-cases/generate-cms-draft.usecase';
import { PrismaAgentRunRepository } from '../ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter';
import { PrismaToolExecutionRepository } from '../ai-copilot/infrastructure/adapters/prisma-tool-execution-repository.adapter';
import { PromptRegistry } from '@corely/prompts';
import { PromptUsageLogger } from '../../shared/prompts/prompt-usage.logger';

@Module({
 imports: [KernelModule, IdentityModule, PromptModule],
 controllers: [
 CmsPostsController,
 CmsCommentsController,
 CmsPublicController,
 CmsAuthController,
 CmsAiController,
 ],
 providers: [
 PrismaCmsPostRepository,
 PrismaCmsCommentRepository,
 PrismaCmsReaderRepository,
 PrismaAgentRunRepository,
 PrismaToolExecutionRepository,
 CmsContentRenderer,
 CmsReaderTokenService,
 CmsReaderAuthGuard,
 {
 provide: CreateCmsPostUseCase,
 useFactory: (
 postRepo: PrismaCmsPostRepository,
 idGenerator: IdGeneratorPort,
 clock: ClockPort,
 renderer: CmsContentRenderer
 ) =>
 new CreateCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 idGenerator,
 clock,
 contentRenderer: renderer,
 }),
 inject: [PrismaCmsPostRepository, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN, CmsContentRenderer],
 },
 {
 provide: UpdateCmsPostUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository, clock: ClockPort) =>
 new UpdateCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 clock,
 }),
 inject: [PrismaCmsPostRepository, CLOCK_PORT_TOKEN],
 },
 {
 provide: UpdateCmsPostContentUseCase,
 useFactory: (
 postRepo: PrismaCmsPostRepository,
 renderer: CmsContentRenderer,
 clock: ClockPort
 ) =>
 new UpdateCmsPostContentUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 contentRenderer: renderer,
 clock,
 }),
 inject: [PrismaCmsPostRepository, CmsContentRenderer, CLOCK_PORT_TOKEN],
 },
 {
 provide: PublishCmsPostUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository, clock: ClockPort) =>
 new PublishCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 clock,
 }),
 inject: [PrismaCmsPostRepository, CLOCK_PORT_TOKEN],
 },
 {
 provide: UnpublishCmsPostUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository, clock: ClockPort) =>
 new UnpublishCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 clock,
 }),
 inject: [PrismaCmsPostRepository, CLOCK_PORT_TOKEN],
 },
 {
 provide: ListCmsPostsUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository) =>
 new ListCmsPostsUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 }),
 inject: [PrismaCmsPostRepository],
 },
 {
 provide: GetCmsPostUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository) =>
 new GetCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 }),
 inject: [PrismaCmsPostRepository],
 },
 {
 provide: ListPublicCmsPostsUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository) =>
 new ListPublicCmsPostsUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 }),
 inject: [PrismaCmsPostRepository],
 },
 {
 provide: GetPublicCmsPostUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository) =>
 new GetPublicCmsPostUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 }),
 inject: [PrismaCmsPostRepository],
 },
 {
 provide: ListCmsCommentsUseCase,
 useFactory: (commentRepo: PrismaCmsCommentRepository) =>
 new ListCmsCommentsUseCase({
 logger: new NestLoggerAdapter(),
 commentRepo,
 }),
 inject: [PrismaCmsCommentRepository],
 },
 {
 provide: ListPublicCmsCommentsUseCase,
 useFactory: (postRepo: PrismaCmsPostRepository, commentRepo: PrismaCmsCommentRepository) =>
 new ListPublicCmsCommentsUseCase({
 logger: new NestLoggerAdapter(),
 postRepo,
 commentRepo,
 }),
 inject: [PrismaCmsPostRepository, PrismaCmsCommentRepository],
 },
 {
 provide: CreateCmsCommentUseCase,
 useFactory: (
 commentRepo: PrismaCmsCommentRepository,
 postRepo: PrismaCmsPostRepository,
 readerRepo: PrismaCmsReaderRepository,
 idGenerator: IdGeneratorPort,
 clock: ClockPort
 ) =>
 new CreateCmsCommentUseCase({
 logger: new NestLoggerAdapter(),
 commentRepo,
 postRepo,
 readerRepo,
 idGenerator,
 clock,
 }),
 inject: [
 PrismaCmsCommentRepository,
 PrismaCmsPostRepository,
 PrismaCmsReaderRepository,
 ID_GENERATOR_TOKEN,
 CLOCK_PORT_TOKEN,
 ],
 },
 {
 provide: ModerateCmsCommentUseCase,
 useFactory: (commentRepo: PrismaCmsCommentRepository, clock: ClockPort) =>
 new ModerateCmsCommentUseCase({
 logger: new NestLoggerAdapter(),
 commentRepo,
 clock,
 }),
 inject: [PrismaCmsCommentRepository, CLOCK_PORT_TOKEN],
 },
 {
 provide: SignUpCmsReaderUseCase,
 useFactory: (
 readerRepo: PrismaCmsReaderRepository,
 tokenService: CmsReaderTokenService,
 idGenerator: IdGeneratorPort,
 clock: ClockPort
 ) =>
 new SignUpCmsReaderUseCase({
 logger: new NestLoggerAdapter(),
 readerRepo,
 tokenService,
 idGenerator,
 clock,
 }),
 inject: [
 PrismaCmsReaderRepository,
 CmsReaderTokenService,
 ID_GENERATOR_TOKEN,
 CLOCK_PORT_TOKEN,
 ],
 },
 {
 provide: SignInCmsReaderUseCase,
 useFactory: (readerRepo: PrismaCmsReaderRepository, tokenService: CmsReaderTokenService) =>
 new SignInCmsReaderUseCase({
 logger: new NestLoggerAdapter(),
 readerRepo,
 tokenService,
 }),
 inject: [PrismaCmsReaderRepository, CmsReaderTokenService],
 },
 {
 provide: GenerateCmsDraftUseCase,
 useFactory: (
 env: EnvService,
 promptRegistry: PromptRegistry,
 promptUsageLogger: PromptUsageLogger,
 agentRuns: PrismaAgentRunRepository,
 toolExecutions: PrismaToolExecutionRepository,
 idGenerator: IdGeneratorPort,
 clock: ClockPort
 ) =>
 new GenerateCmsDraftUseCase({
 logger: new NestLoggerAdapter(),
 env,
 promptRegistry,
 promptUsageLogger,
 agentRuns,
 toolExecutions,
 idGenerator,
 clock,
 }),
 inject: [
 EnvService,
 PromptRegistry,
 PromptUsageLogger,
 PrismaAgentRunRepository,
 PrismaToolExecutionRepository,
 ID_GENERATOR_TOKEN,
 CLOCK_PORT_TOKEN,
 ],
 },
 {
 provide: CmsApplication,
 useFactory: (
 createPost: CreateCmsPostUseCase,
 updatePost: UpdateCmsPostUseCase,
 updatePostContent: UpdateCmsPostContentUseCase,
 publishPost: PublishCmsPostUseCase,
 unpublishPost: UnpublishCmsPostUseCase,
 listPosts: ListCmsPostsUseCase,
 getPost: GetCmsPostUseCase,
 listPublicPosts: ListPublicCmsPostsUseCase,
 getPublicPost: GetPublicCmsPostUseCase,
 listComments: ListCmsCommentsUseCase,
 listPublicComments: ListPublicCmsCommentsUseCase,
 createComment: CreateCmsCommentUseCase,
 moderateComment: ModerateCmsCommentUseCase,
 signUpReader: SignUpCmsReaderUseCase,
 signInReader: SignInCmsReaderUseCase,
 generateDraft: GenerateCmsDraftUseCase
 ) =>
 new CmsApplication(
 createPost,
 updatePost,
 updatePostContent,
 publishPost,
 unpublishPost,
 listPosts,
 getPost,
 listPublicPosts,
 getPublicPost,
 listComments,
 listPublicComments,
 createComment,
 moderateComment,
 signUpReader,
 signInReader,
 generateDraft
 ),
 inject: [
 CreateCmsPostUseCase,
 UpdateCmsPostUseCase,
 UpdateCmsPostContentUseCase,
 PublishCmsPostUseCase,
 UnpublishCmsPostUseCase,
 ListCmsPostsUseCase,
 GetCmsPostUseCase,
 ListPublicCmsPostsUseCase,
 GetPublicCmsPostUseCase,
 ListCmsCommentsUseCase,
 ListPublicCmsCommentsUseCase,
 CreateCmsCommentUseCase,
 ModerateCmsCommentUseCase,
 SignUpCmsReaderUseCase,
 SignInCmsReaderUseCase,
 GenerateCmsDraftUseCase,
 ],
 },
 ],
 exports: [CmsApplication],
})
export class CmsModule {}
