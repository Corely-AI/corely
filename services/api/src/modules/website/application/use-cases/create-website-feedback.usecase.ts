import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type { CreateWebsiteFeedbackInput, CreateWebsiteFeedbackOutput } from "@corely/contracts";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { PublicWorkspaceResolver } from "@/shared/public";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteFeedbackRepositoryPort } from "../ports/feedback-repository.port";
import { normalizeYoutubeUrls } from "../../domain/youtube-url";
import { isWebsitePreviewTokenValid } from "../../domain/preview-token";
import { resolvePublicWebsiteSiteRef } from "./resolve-public-site-ref";

type Deps = {
  logger: LoggerPort;
  feedbackRepo: WebsiteFeedbackRepositoryPort;
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

const normalizeImageFileIds = (fileIds: string[] | undefined): string[] => {
  if (!fileIds?.length) {
    return [];
  }

  const values = new Set<string>();
  for (const fileId of fileIds) {
    const trimmed = fileId.trim();
    if (trimmed.length > 0) {
      values.add(trimmed);
    }
  }
  return Array.from(values);
};

export class CreateWebsiteFeedbackUseCase extends BaseUseCase<
  CreateWebsiteFeedbackInput,
  CreateWebsiteFeedbackOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateWebsiteFeedbackInput): CreateWebsiteFeedbackInput {
    if (!input.message?.trim()) {
      throw new ValidationError(
        "message is required",
        undefined,
        "Website:FeedbackMessageRequired"
      );
    }
    return input;
  }

  protected async handle(
    input: CreateWebsiteFeedbackInput,
    _ctx: UseCaseContext
  ): Promise<Result<CreateWebsiteFeedbackOutput, UseCaseError>> {
    if (input.siteRef.mode === "preview" && !isWebsitePreviewTokenValid(input.siteRef.token)) {
      return err(
        new ValidationError("preview token is invalid", undefined, "Website:InvalidPreviewToken")
      );
    }

    const resolved = await resolvePublicWebsiteSiteRef(this.deps, {
      host: input.siteRef.hostname,
      path: input.siteRef.path,
      locale: input.siteRef.locale,
    });

    if (!resolved) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const feedbackId = this.deps.idGenerator.newId();
    const youtubeVideos = normalizeYoutubeUrls(input.youtubeUrls);
    const imageFileIds = normalizeImageFileIds(input.imageFileIds);

    await this.deps.feedbackRepo.create({
      id: feedbackId,
      tenantId: resolved.site.tenantId,
      siteId: resolved.site.id,
      pageId: resolved.page?.id ?? null,
      message: input.message,
      email: input.email ?? null,
      name: input.name ?? null,
      rating: input.rating ?? null,
      youtubeVideos,
      metaJson: input.meta ?? null,
      createdAt: this.deps.clock.now(),
      images: imageFileIds.map((fileId, order) => ({
        id: this.deps.idGenerator.newId(),
        tenantId: resolved.site.tenantId,
        fileId,
        order,
      })),
    });

    return ok({ feedbackId });
  }
}
