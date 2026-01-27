import type { CreateCmsPostUseCase } from "./use-cases/create-cms-post.usecase";
import type { UpdateCmsPostUseCase } from "./use-cases/update-cms-post.usecase";
import type { UpdateCmsPostContentUseCase } from "./use-cases/update-cms-post-content.usecase";
import type { PublishCmsPostUseCase } from "./use-cases/publish-cms-post.usecase";
import type { UnpublishCmsPostUseCase } from "./use-cases/unpublish-cms-post.usecase";
import type { ListCmsPostsUseCase } from "./use-cases/list-cms-posts.usecase";
import type { GetCmsPostUseCase } from "./use-cases/get-cms-post.usecase";
import type { ListPublicCmsPostsUseCase } from "./use-cases/list-public-cms-posts.usecase";
import type { GetPublicCmsPostUseCase } from "./use-cases/get-public-cms-post.usecase";
import type { ListCmsCommentsUseCase } from "./use-cases/list-cms-comments.usecase";
import type { ListPublicCmsCommentsUseCase } from "./use-cases/list-public-cms-comments.usecase";
import type { CreateCmsCommentUseCase } from "./use-cases/create-cms-comment.usecase";
import type { ModerateCmsCommentUseCase } from "./use-cases/moderate-cms-comment.usecase";
import type { SignUpCmsReaderUseCase } from "./use-cases/sign-up-cms-reader.usecase";
import type { SignInCmsReaderUseCase } from "./use-cases/sign-in-cms-reader.usecase";
import type { GenerateCmsDraftUseCase } from "./use-cases/generate-cms-draft.usecase";

export class CmsApplication {
  constructor(
    public readonly createPost: CreateCmsPostUseCase,
    public readonly updatePost: UpdateCmsPostUseCase,
    public readonly updatePostContent: UpdateCmsPostContentUseCase,
    public readonly publishPost: PublishCmsPostUseCase,
    public readonly unpublishPost: UnpublishCmsPostUseCase,
    public readonly listPosts: ListCmsPostsUseCase,
    public readonly getPost: GetCmsPostUseCase,
    public readonly listPublicPosts: ListPublicCmsPostsUseCase,
    public readonly getPublicPost: GetPublicCmsPostUseCase,
    public readonly listComments: ListCmsCommentsUseCase,
    public readonly listPublicComments: ListPublicCmsCommentsUseCase,
    public readonly createComment: CreateCmsCommentUseCase,
    public readonly moderateComment: ModerateCmsCommentUseCase,
    public readonly signUpReader: SignUpCmsReaderUseCase,
    public readonly signInReader: SignInCmsReaderUseCase,
    public readonly generateDraft: GenerateCmsDraftUseCase
  ) {}
}
