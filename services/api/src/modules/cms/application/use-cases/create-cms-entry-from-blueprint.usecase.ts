import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  ok,
  err,
} from "@corely/kernel";
import type { CmsPostStatus } from "@corely/contracts";
import { CmsPostEntity } from "../../domain/cms-post.entity";
import type { CmsPostRepositoryPort } from "../ports/cms-post-repository.port";
import type { CmsContentRenderer } from "../services/cms-content-renderer.service";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";

export type CreateCmsEntryFromBlueprintInput = {
  title: string;
  excerpt?: string | null;
  contentJson: unknown;
  slug?: string;
  status?: CmsPostStatus;
};

export type CreateCmsEntryFromBlueprintOutput = {
  entryId: string;
  slug: string;
};

type Deps = {
  logger: LoggerPort;
  postRepo: CmsPostRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  contentRenderer: CmsContentRenderer;
};

export class CreateCmsEntryFromBlueprintUseCase extends BaseUseCase<
  CreateCmsEntryFromBlueprintInput,
  CreateCmsEntryFromBlueprintOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateCmsEntryFromBlueprintInput): CreateCmsEntryFromBlueprintInput {
    if (!input.title?.trim()) {
      throw new ValidationError("title is required");
    }
    return input;
  }

  protected async handle(
    input: CreateCmsEntryFromBlueprintInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCmsEntryFromBlueprintOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const baseSlug = slugify(input.slug?.trim() || input.title);
    if (!baseSlug) {
      return err(new ValidationError("slug is required"));
    }

    const slug = await this.resolveUniqueSlug(ctx.tenantId, baseSlug);
    if (!slug) {
      return err(new ConflictError("slug already exists"));
    }

    const now = this.deps.clock.now();
    const status = input.status ?? "DRAFT";
    const rendered = this.deps.contentRenderer.render(input.contentJson);

    const post = CmsPostEntity.create({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      status,
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt ?? null,
      coverImageFileId: null,
      tags: [],
      contentJson: input.contentJson,
      contentHtml: rendered.html,
      contentText: rendered.text,
      publishedAt: status === "PUBLISHED" ? now : null,
      authorUserId: ctx.userId ?? "system",
      createdAt: now,
    });

    await this.deps.postRepo.create(post);

    return ok({ entryId: post.id, slug });
  }

  private async resolveUniqueSlug(tenantId: string, base: string): Promise<string | null> {
    const existing = await this.deps.postRepo.findBySlug(tenantId, base);
    if (!existing) {
      return base;
    }

    for (let i = 2; i < 50; i += 1) {
      const candidate = `${base}-${i}`;
      const conflict = await this.deps.postRepo.findBySlug(tenantId, candidate);
      if (!conflict) {
        return candidate;
      }
    }

    return null;
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
