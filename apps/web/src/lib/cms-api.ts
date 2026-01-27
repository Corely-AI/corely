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
} from "@corely/contracts";
import { createIdempotencyKey, request } from "@corely/api-client";
import { apiClient } from "./api-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

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
  const workspaceId = getActiveWorkspaceId();
  return request<T>({
    url: `${resolveCmsApiBaseUrl()}${endpoint}`,
    method: opts?.method ?? "GET",
    body: opts?.body,
    accessToken: opts?.token,
    workspaceId: workspaceId ?? null,
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
    const intent = await apiClient.post<CreateUploadIntentOutput>(
      "/documents/upload-intent",
      {
        filename: file.name,
        contentType,
        sizeBytes: file.size,
        isPublic: true,
        documentType: "UPLOAD",
        category: opts.category,
        purpose: opts.purpose,
      } satisfies CreateUploadIntentInput,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );

    const headers = new Headers(intent.upload.requiredHeaders ?? {});
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }

    const uploadResponse = await fetch(intent.upload.url, {
      method: intent.upload.method,
      headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    const completed = await apiClient.post<CompleteUploadOutput>(
      `/documents/${intent.document.id}/files/${intent.file.id}/complete`,
      { sizeBytes: file.size },
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

export const buildCmsPostPublicLink = (slug: string) => `/p/${slug}`;

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
