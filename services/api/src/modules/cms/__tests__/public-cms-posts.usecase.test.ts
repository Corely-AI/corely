import { describe, expect, it } from "vitest";
import { NoopLogger } from "@corely/kernel";
import { CmsPostEntity } from "../domain/cms-post.entity";
import type {
  CmsPostListParams,
  CmsPostRepositoryPort,
} from "../application/ports/cms-post-repository.port";
import { GetPublicCmsPostUseCase } from "../application/use-cases/get-public-cms-post.usecase";
import { ListPublicCmsPostsUseCase } from "../application/use-cases/list-public-cms-posts.usecase";

class FakePostRepo implements CmsPostRepositoryPort {
  lastListParams: CmsPostListParams | null = null;
  lastFindOptions: { publishedOnly?: boolean } | undefined;
  post: CmsPostEntity | null = null;
  listResponse: { items: CmsPostEntity[]; total: number } = { items: [], total: 0 };

  async create(): Promise<void> {}
  async save(): Promise<void> {}
  async findById(): Promise<CmsPostEntity | null> {
    return this.post;
  }
  async findBySlug(
    _tenantId: string,
    _slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<CmsPostEntity | null> {
    this.lastFindOptions = opts;
    if (!this.post) {
      return null;
    }
    if (opts?.publishedOnly && this.post.status !== "PUBLISHED") {
      return null;
    }
    return this.post;
  }
  async list(params: CmsPostListParams): Promise<{ items: CmsPostEntity[]; total: number }> {
    this.lastListParams = params;
    return this.listResponse;
  }
}

const createPost = (status: "DRAFT" | "PUBLISHED") =>
  CmsPostEntity.create({
    id: "post-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    status,
    slug: "test-post",
    title: "Test Post",
    excerpt: null,
    coverImageFileId: null,
    contentJson: { type: "doc", content: [] },
    contentHtml: "<p>Test</p>",
    contentText: "Test",
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    authorUserId: "user-1",
    createdAt: new Date(),
  });

describe("Public CMS use cases", () => {
  it("requests only published posts when listing public posts", async () => {
    const repo = new FakePostRepo();
    const useCase = new ListPublicCmsPostsUseCase({
      logger: new NoopLogger(),
      postRepo: repo,
    });

    const result = await useCase.execute(
      { page: 1, pageSize: 10 },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );

    expect(result.ok).toBe(true);
    expect(repo.lastListParams?.publishedOnly).toBe(true);
  });

  it("rejects draft posts on public lookup", async () => {
    const repo = new FakePostRepo();
    repo.post = createPost("DRAFT");
    const useCase = new GetPublicCmsPostUseCase({
      logger: new NoopLogger(),
      postRepo: repo,
    });

    const result = await useCase.execute(
      { slug: "test-post" },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );

    expect(result.ok).toBe(false);
    expect(repo.lastFindOptions?.publishedOnly).toBe(true);
  });

  it("returns published posts on public lookup", async () => {
    const repo = new FakePostRepo();
    repo.post = createPost("PUBLISHED");
    const useCase = new GetPublicCmsPostUseCase({
      logger: new NoopLogger(),
      postRepo: repo,
    });

    const result = await useCase.execute(
      { slug: "test-post" },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );

    expect(result.ok).toBe(true);
    expect(repo.lastFindOptions?.publishedOnly).toBe(true);
  });
});
