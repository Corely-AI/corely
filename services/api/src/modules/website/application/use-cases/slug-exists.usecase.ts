import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { WebsiteSlugExistsInput, WebsiteSlugExistsOutput } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import { normalizeWebsiteSlug } from "../../domain/website.validators";
import { type PublicWorkspaceResolver } from "@/shared/public";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
};

export class WebsiteSlugExistsUseCase extends BaseUseCase<
  WebsiteSlugExistsInput,
  WebsiteSlugExistsOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: WebsiteSlugExistsInput): WebsiteSlugExistsInput {
    if (!input.workspaceSlug?.trim()) {
      throw new ValidationError("workspaceSlug is required", undefined, "Website:InvalidWorkspace");
    }
    if (!input.websiteSlug?.trim()) {
      throw new ValidationError("websiteSlug is required", undefined, "Website:InvalidSlug");
    }
    return input;
  }

  protected async handle(
    input: WebsiteSlugExistsInput,
    _ctx: UseCaseContext
  ): Promise<Result<WebsiteSlugExistsOutput, UseCaseError>> {
    let slug: string;
    try {
      slug = normalizeWebsiteSlug(input.websiteSlug);
    } catch {
      return ok({ exists: false });
    }

    try {
      const workspace = await this.deps.publicWorkspaceResolver.resolveFromRequest({
        host: null,
        path: `/w/${input.workspaceSlug}`,
      });
      const site = await this.deps.siteRepo.findBySlug(workspace.tenantId, slug);
      return ok({ exists: Boolean(site), isDefault: site?.isDefault ?? undefined });
    } catch {
      return ok({ exists: false });
    }
  }
}
