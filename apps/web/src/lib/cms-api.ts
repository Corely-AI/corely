import type {
  CmsCommentDto,
  CmsPostDto,
  CmsPostSummaryDto,
  CmsPublicPostDto,
  CreateCmsCommentInput,
  CreateCmsCommentOutput,
  CreateCmsPostInput,
  CreateCmsPostOutput,
  GenerateCmsDraftInput,
  GenerateCmsDraftOutput,
  ListCmsCommentsInput,
  ListCmsCommentsOutput,
  ListCmsPostsInput,
  ListCmsPostsOutput,
  ListPublicCmsCommentsInput,
  ListPublicCmsCommentsOutput,
  ListPublicCmsPostsInput,
  ListPublicCmsPostsOutput,
  GetCmsPostOutput,
  GetPublicCmsPostOutput,
  UpdateCmsPostContentInput,
  UpdateCmsPostContentOutput,
  UpdateCmsPostInput,
  UpdateCmsPostOutput,
  UpdateCmsCommentStatusOutput,
  CmsReaderAuthOutput,
  CmsReaderLoginInput,
  CmsReaderSignUpInput,
  CreateUploadIntentInput,
  CreateUploadIntentOutput,
  CompleteUploadOutput,
  UploadFileBase64Input,
  UploadFileOutput,
} from "@corely/contracts";
import { createIdempotencyKey, request } from "@corely/api-client";
import { apiClient } from "./api-client";
import {
  resolvePublicWorkspacePathPrefix,
  resolvePublicWorkspaceSlug,
} from "@/shared/public-workspace";

const CMS_READER_STORAGE_KEY = "cms-reader-session";

export type CmsReaderSession = {
  accessToken: string;
  reader: CmsReaderAuthOutput["reader"];
};

export const resolveCmsApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:3000");

export const buildPublicFileUrl = (fileId: string) =>
  `${resolveCmsApiBaseUrl()}/public/documents/files/${fileId}`;

export const loadCmsReaderSession = (): CmsReaderSession | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CMS_READER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CmsReaderSession;
    if (!parsed?.accessToken || !parsed.reader) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveCmsReaderSession = (session: CmsReaderSession) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CMS_READER_STORAGE_KEY, JSON.stringify(session));
};

export const clearCmsReaderSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(CMS_READER_STORAGE_KEY);
};

const requestPublic = async <T>(
  endpoint: string,
  opts?: {
    method?: string;
    body?: unknown;
    token?: string;
    idempotencyKey?: string;
    correlationId?: string;
  }
): Promise<T> => {
  const pathPrefix = resolvePublicWorkspacePathPrefix();
  const prefixedEndpoint = pathPrefix ? `${pathPrefix}${endpoint}` : endpoint;
  const url = withPublicWorkspaceQuery(prefixedEndpoint);

  return request<T>({
    url: `${resolveCmsApiBaseUrl()}${url}`,
    method: opts?.method ?? "GET",
    body: opts?.body,
    accessToken: opts?.token,
    idempotencyKey: opts?.idempotencyKey,
    correlationId: opts?.correlationId,
  });
};

export type CmsUploadResult = {
  documentId: string;
  fileId: string;
  url: string;
};

export class CmsApi {
  async listPosts(params?: ListCmsPostsInput): Promise<ListCmsPostsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.q) {
      queryParams.append("q", params.q);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/cms/posts?${queryString}` : "/cms/posts";
    return apiClient.get<ListCmsPostsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPost(postId: string): Promise<CmsPostDto> {
    const result = await apiClient.get<GetCmsPostOutput>(`/cms/posts/${postId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.post;
  }

  async createPost(input: CreateCmsPostInput): Promise<CmsPostDto> {
    const result = await apiClient.post<CreateCmsPostOutput>("/cms/posts", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.post;
  }

  async updatePost(postId: string, input: UpdateCmsPostInput): Promise<CmsPostDto> {
    const result = await apiClient.put<UpdateCmsPostOutput>(`/cms/posts/${postId}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.post;
  }

  async updatePostContent(postId: string, input: UpdateCmsPostContentInput): Promise<CmsPostDto> {
    const result = await apiClient.put<UpdateCmsPostContentOutput>(
      `/cms/posts/${postId}/content`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.post;
  }

  async publishPost(postId: string): Promise<CmsPostDto> {
    const result = await apiClient.post<UpdateCmsPostOutput>(
      `/cms/posts/${postId}/publish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.post;
  }

  async unpublishPost(postId: string): Promise<CmsPostDto> {
    const result = await apiClient.post<UpdateCmsPostOutput>(
      `/cms/posts/${postId}/unpublish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.post;
  }

  async listComments(params?: ListCmsCommentsInput): Promise<ListCmsCommentsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.postId) {
      queryParams.append("postId", params.postId);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/cms/comments?${queryString}` : "/cms/comments";
    return apiClient.get<ListCmsCommentsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async moderateComment(commentId: string, status: "APPROVED" | "REJECTED" | "SPAM" | "DELETED") {
    const action =
      status === "APPROVED"
        ? "approve"
        : status === "REJECTED"
          ? "reject"
          : status === "SPAM"
            ? "spam"
            : "delete";
    const result = await apiClient.post<UpdateCmsCommentStatusOutput>(
      `/cms/comments/${commentId}/${action}`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.comment;
  }

  async generateDraft(input: GenerateCmsDraftInput): Promise<GenerateCmsDraftOutput> {
    return apiClient.post<GenerateCmsDraftOutput>("/cms/ai/draft", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listPublicPosts(params?: ListPublicCmsPostsInput): Promise<ListPublicCmsPostsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.q) {
      queryParams.append("q", params.q);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/public/cms/posts?${queryString}` : "/public/cms/posts";
    return requestPublic<ListPublicCmsPostsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPublicPost(slug: string): Promise<CmsPublicPostDto> {
    const result = await requestPublic<GetPublicCmsPostOutput>(`/public/cms/posts/${slug}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.post;
  }

  async listPublicComments(
    slug: string,
    params?: ListPublicCmsCommentsInput
  ): Promise<ListPublicCmsCommentsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/public/cms/posts/${slug}/comments?${queryString}`
      : `/public/cms/posts/${slug}/comments`;
    return requestPublic<ListPublicCmsCommentsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createPublicComment(
    slug: string,
    input: CreateCmsCommentInput,
    accessToken: string
  ): Promise<CmsCommentDto> {
    const result = await requestPublic<CreateCmsCommentOutput>(
      `/public/cms/posts/${slug}/comments`,
      {
        method: "POST",
        body: input,
        token: accessToken,
        idempotencyKey: createIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.comment;
  }

  async readerSignUp(input: CmsReaderSignUpInput): Promise<CmsReaderAuthOutput> {
    return requestPublic<CmsReaderAuthOutput>("/public/cms/auth/signup", {
      method: "POST",
      body: input,
      idempotencyKey: createIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async readerLogin(input: CmsReaderLoginInput): Promise<CmsReaderAuthOutput> {
    return requestPublic<CmsReaderAuthOutput>("/public/cms/auth/login", {
      method: "POST",
      body: input,
      idempotencyKey: createIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async uploadCmsAsset(
    file: File,
    opts: { purpose: string; category?: string }
  ): Promise<CmsUploadResult> {
    const contentType = file.type || "application/octet-stream";

    // Read file as base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:...base64, prefix
        const base64Content = result.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

    const completed = await apiClient.post<UploadFileOutput>(
      "/documents/upload-base64",
      {
        filename: file.name,
        contentType,
        base64,
        isPublic: true,
        category: opts.category,
        purpose: opts.purpose,
      } satisfies UploadFileBase64Input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );

    return {
      documentId: completed.document.id,
      fileId: completed.file.id,
      url: buildPublicFileUrl(completed.file.id),
    };
  }
}

export const cmsApi = new CmsApi();

export const buildCmsPostPublicLink = (slug: string, workspaceSlug?: string | null) =>
  workspaceSlug ? `/w/${workspaceSlug}/cms/${slug}` : `/cms/${slug}`;

const allowPublicWorkspaceQuery = () =>
  import.meta.env.DEV || import.meta.env.VITE_PUBLIC_WORKSPACE_QUERY_ENABLED === "true";

const withPublicWorkspaceQuery = (endpoint: string): string => {
  const workspaceSlug = resolvePublicWorkspaceSlug();
  if (!workspaceSlug || !allowPublicWorkspaceQuery()) {
    return endpoint;
  }

  const url = new URL(endpoint, "http://localhost");
  if (!url.searchParams.has("w")) {
    url.searchParams.set("w", workspaceSlug);
  }
  return `${url.pathname}${url.search}`;
};

export const mapPostSummaryToPublic = (
  post: CmsPostSummaryDto
): {
  title: string;
  excerpt?: string | null;
  slug: string;
  coverImageFileId?: string | null;
  publishedAt?: string | null;
} => ({
  title: post.title,
  excerpt: post.excerpt ?? null,
  slug: post.slug,
  coverImageFileId: post.coverImageFileId ?? null,
  publishedAt: post.publishedAt ?? null,
});
