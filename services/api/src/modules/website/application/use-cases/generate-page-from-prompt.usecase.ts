import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import {
  type GenerateWebsitePageInput,
  type GenerateWebsitePageOutput,
  WebsitePageBlueprintSchema,
  type WebsitePage,
} from "@corely/contracts";
import type { WebsiteAiGeneratorPort } from "../ports/website-ai.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { CmsWritePort } from "../ports/cms-write.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import type { IdempotencyStoragePort } from "@shared/ports/idempotency-storage.port";
import { normalizeLocale, normalizePath } from "../../domain/website.validators";

const ACTION_KEY = "website.ai.generate_page";

type Deps = {
  logger: LoggerPort;
  ai: WebsiteAiGeneratorPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  cmsWrite: CmsWritePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotencyStore: IdempotencyStoragePort;
};

@RequireTenant()
export class GenerateWebsitePageFromPromptUseCase extends BaseUseCase<
  GenerateWebsitePageInput,
  GenerateWebsitePageOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: GenerateWebsitePageInput): GenerateWebsitePageInput {
    if (!input.siteId?.trim()) {
      throw new ValidationError("siteId is required", undefined, "Website:InvalidSite");
    }
    if (!input.prompt?.trim()) {
      throw new ValidationError("prompt is required", undefined, "Website:InvalidPrompt");
    }
    if (!input.pageType?.trim()) {
      throw new ValidationError("pageType is required", undefined, "Website:InvalidPageType");
    }
    if (!input.locale?.trim()) {
      throw new ValidationError("locale is required", undefined, "Website:InvalidLocale");
    }
    return input;
  }

  protected async handle(
    input: GenerateWebsitePageInput,
    ctx: UseCaseContext
  ): Promise<Result<GenerateWebsitePageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    if (!ctx.workspaceId) {
      return err(
        new ValidationError("workspaceId is required", undefined, "Website:WorkspaceRequired")
      );
    }

    const idempotencyKey = input.idempotencyKey ?? "";
    if (idempotencyKey) {
      const cached = await this.deps.idempotencyStore.get(ACTION_KEY, ctx.tenantId, idempotencyKey);
      if (cached?.body) {
        return ok(cached.body as GenerateWebsitePageOutput);
      }
    }

    const locale = normalizeLocale(input.locale);

    const { blueprint, previewSummary } = await this.deps.ai.generatePageBlueprint({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? null,
      pageType: input.pageType,
      locale,
      prompt: input.prompt,
      brandVoice: input.brandVoice,
      suggestedPath: input.suggestedPath,
    });

    const parsedBlueprintResult = WebsitePageBlueprintSchema.safeParse(blueprint);
    if (!parsedBlueprintResult.success) {
      return err(
        new ValidationError(
          "AI blueprint validation failed",
          parsedBlueprintResult.error.flatten(),
          "Website:InvalidBlueprint"
        )
      );
    }
    const parsedBlueprint = parsedBlueprintResult.data;

    const suggestedPath =
      input.suggestedPath ?? parsedBlueprint.suggestedPath ?? slugify(parsedBlueprint.title);

    const basePath = normalizePath(suggestedPath);
    const path = await this.ensureUniquePath(ctx.tenantId, site.id, locale, basePath);

    const cms = await this.deps.cmsWrite.createDraftEntryFromBlueprint({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      authorUserId: ctx.userId ?? null,
      locale,
      blueprint: {
        ...parsedBlueprint,
        template: parsedBlueprint.template || input.pageType,
        suggestedPath: path,
      },
    });

    const now = this.deps.clock.now().toISOString();
    const page: WebsitePage = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      siteId: site.id,
      path,
      locale,
      template: parsedBlueprint.template || input.pageType,
      status: "DRAFT",
      cmsEntryId: cms.entryId,
      seoTitle: parsedBlueprint.seoTitle ?? null,
      seoDescription: parsedBlueprint.seoDescription ?? null,
      seoImageFileId: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.pageRepo.create(page);

    const output: GenerateWebsitePageOutput = {
      pageId: page.id,
      cmsEntryId: cms.entryId,
      blueprint: parsedBlueprint,
      previewSummary,
    };

    if (idempotencyKey) {
      await this.deps.idempotencyStore.store(ACTION_KEY, ctx.tenantId, idempotencyKey, {
        body: output,
      });
    }

    return ok(output);
  }

  private async ensureUniquePath(
    tenantId: string,
    siteId: string,
    locale: string,
    basePath: string
  ): Promise<string> {
    const normalizedBase = basePath === "/" ? "/home" : basePath;
    const existing = await this.deps.pageRepo.findByPath(tenantId, siteId, basePath, locale);
    if (!existing) {
      return basePath;
    }

    if (normalizedBase !== basePath) {
      const normalizedExisting = await this.deps.pageRepo.findByPath(
        tenantId,
        siteId,
        normalizedBase,
        locale
      );
      if (!normalizedExisting) {
        return normalizedBase;
      }
    }

    let suffix = 2;
    while (suffix < 50) {
      const candidate = `${normalizedBase}-${suffix}`;
      const found = await this.deps.pageRepo.findByPath(tenantId, siteId, candidate, locale);
      if (!found) {
        return candidate;
      }
      suffix += 1;
    }

    return `${normalizedBase}-${Date.now()}`;
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80) || "page";
