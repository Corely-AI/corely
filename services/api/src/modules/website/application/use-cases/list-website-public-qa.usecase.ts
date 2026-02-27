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
import type { ListWebsiteQaInput, ListWebsiteQaOutput } from "@corely/contracts";
import type { PublicWorkspaceResolver } from "@/shared/public";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteQaRepositoryPort } from "../ports/qa-repository.port";
import { normalizeLocale } from "../../domain/website.validators";
import { resolvePublicWebsiteSiteRef } from "./resolve-public-site-ref";

type Deps = {
  logger: LoggerPort;
  qaRepo: WebsiteQaRepositoryPort;
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
};

export class ListWebsitePublicQaUseCase extends BaseUseCase<
  ListWebsiteQaInput,
  ListWebsiteQaOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: ListWebsiteQaInput): ListWebsiteQaInput {
    if (input.siteId?.trim()) {
      return input;
    }
    if (!input.hostname?.trim() || !input.path?.trim()) {
      throw new ValidationError(
        "siteId or hostname+path is required",
        undefined,
        "Website:InvalidPublicQaInput"
      );
    }
    return input;
  }

  protected async handle(
    input: ListWebsiteQaInput,
    _ctx: UseCaseContext
  ): Promise<Result<ListWebsiteQaOutput, UseCaseError>> {
    if (input.siteId) {
      const site = await this.deps.siteRepo.findByIdPublic?.(input.siteId);
      if (!site) {
        return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
      }

      const scope = input.scope ?? "site";
      if (scope === "page" && !input.pageId) {
        return ok({ items: [] });
      }

      const requestedLocale = normalizeLocale(input.locale ?? site.defaultLocale);
      let items = await this.deps.qaRepo.listPublished({
        tenantId: site.tenantId,
        siteId: site.id,
        locale: requestedLocale,
        scope,
        pageId: scope === "page" ? (input.pageId ?? null) : null,
      });

      const fallbackLocale = normalizeLocale(site.defaultLocale);
      if (items.length === 0 && fallbackLocale !== requestedLocale) {
        items = await this.deps.qaRepo.listPublished({
          tenantId: site.tenantId,
          siteId: site.id,
          locale: fallbackLocale,
          scope,
          pageId: scope === "page" ? (input.pageId ?? null) : null,
        });
      }

      return ok({
        items: items.map((item) => ({
          id: item.id,
          question: item.question,
          answerHtml: item.answerHtml,
          order: item.order,
          updatedAt: item.updatedAt,
        })),
      });
    }

    const resolved = await resolvePublicWebsiteSiteRef(this.deps, {
      host: input.hostname,
      path: input.path,
      locale: input.locale,
    });

    if (!resolved) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const scope = input.scope ?? "site";
    if (scope === "page" && !resolved.page) {
      return ok({ items: [] });
    }

    const requestedLocale = resolved.locale;

    let items = await this.deps.qaRepo.listPublished({
      tenantId: resolved.site.tenantId,
      siteId: resolved.site.id,
      locale: requestedLocale,
      scope,
      pageId: scope === "page" ? (resolved.page?.id ?? null) : null,
    });

    const fallbackLocale = normalizeLocale(resolved.site.defaultLocale);
    if (items.length === 0 && fallbackLocale !== requestedLocale) {
      const fallbackPage =
        scope === "page"
          ? await this.deps.pageRepo.findByPath(
              resolved.site.tenantId,
              resolved.site.id,
              resolved.resolvedPath,
              fallbackLocale
            )
          : null;

      if (scope === "site" || fallbackPage) {
        items = await this.deps.qaRepo.listPublished({
          tenantId: resolved.site.tenantId,
          siteId: resolved.site.id,
          locale: fallbackLocale,
          scope,
          pageId: scope === "page" ? (fallbackPage?.id ?? null) : null,
        });
      }
    }

    return ok({
      items: items.map((item) => ({
        id: item.id,
        question: item.question,
        answerHtml: item.answerHtml,
        order: item.order,
        updatedAt: item.updatedAt,
      })),
    });
  }
}
