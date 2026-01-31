import { createCrudQueryKeys } from "@/shared/crud";
import type {
  ListCmsPostsInput,
  ListPublicCmsPostsInput,
  ListPublicCmsCommentsInput,
} from "@corely/contracts";

export const cmsPostKeys = createCrudQueryKeys("cms-posts");
export const cmsCommentKeys = createCrudQueryKeys("cms-comments");

export const cmsPublicKeys = {
  posts: (workspaceSlug?: string | null, params?: ListPublicCmsPostsInput) => [
    "cms-public",
    workspaceSlug ?? "unknown",
    "posts",
    params ?? {},
  ],
  post: (workspaceSlug?: string | null, slug?: string) => [
    "cms-public",
    workspaceSlug ?? "unknown",
    "post",
    slug ?? "",
  ],
  comments: (workspaceSlug?: string | null, slug?: string, params?: ListPublicCmsCommentsInput) => [
    "cms-public",
    workspaceSlug ?? "unknown",
    "comments",
    { slug: slug ?? "", ...(params ?? {}) },
  ],
  adminList: (params?: ListCmsPostsInput) => ["cms-admin", "posts", params ?? {}],
};
