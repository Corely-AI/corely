import { createCrudQueryKeys } from "@/shared/crud";
import type {
  ListCmsPostsInput,
  ListPublicCmsPostsInput,
  ListPublicCmsCommentsInput,
} from "@corely/contracts";

export const cmsPostKeys = createCrudQueryKeys("cms-posts");
export const cmsCommentKeys = createCrudQueryKeys("cms-comments");

export const cmsPublicKeys = {
  posts: (params?: ListPublicCmsPostsInput) => ["cms-public", "posts", params ?? {}],
  post: (slug?: string) => ["cms-public", "post", slug ?? ""],
  comments: (slug?: string, params?: ListPublicCmsCommentsInput) => [
    "cms-public",
    "comments",
    { slug: slug ?? "", ...(params ?? {}) },
  ],
  adminList: (params?: ListCmsPostsInput) => ["cms-admin", "posts", params ?? {}],
};
