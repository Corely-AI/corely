import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWebsiteFeedbackInputSchema,
  CreateWebsiteFeedbackOutputSchema,
  ListWebsiteQaInputSchema,
  ListWebsiteQaOutputSchema,
  ListPublicWebsiteWallOfLoveItemsInputSchema,
  ListPublicWebsiteWallOfLoveItemsOutputSchema,
  ResolveWebsitePublicInputSchema,
  ResolveWebsitePublicOutputSchema,
  WebsiteSlugExistsInputSchema,
  WebsiteSlugExistsOutputSchema,
} from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "@/shared/http/usecase-mappers";
import { WebsiteApplication } from "../../application/website.application";

const FEEDBACK_RATE_LIMIT_WINDOW_MS = 60_000;
const FEEDBACK_RATE_LIMIT_MAX = 20;
const feedbackRateBuckets = new Map<string, { count: number; resetAt: number }>();

const resolveClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(",")[0]?.trim() ?? "unknown";
  }
  if (typeof req.ip === "string" && req.ip.length > 0) {
    return req.ip;
  }
  return req.socket.remoteAddress ?? "unknown";
};

const enforceFeedbackRateLimit = (key: string): void => {
  const now = Date.now();
  const bucket = feedbackRateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    feedbackRateBuckets.set(key, { count: 1, resetAt: now + FEEDBACK_RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= FEEDBACK_RATE_LIMIT_MAX) {
    throw new HttpException(
      "Too many feedback submissions. Try again in a minute.",
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  bucket.count += 1;
  feedbackRateBuckets.set(key, bucket);
};

@Controller("public/website")
export class WebsitePublicController {
  constructor(private readonly app: WebsiteApplication) {}

  @Get("resolve")
  @Header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=60")
  async resolve(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ResolveWebsitePublicInputSchema.parse({
      host: query.host,
      path: query.path,
      locale: query.locale,
      mode: query.mode ?? "live",
      token: query.token,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.resolvePublicPage.execute(input, ctx);
    return ResolveWebsitePublicOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("feedback")
  async createFeedback(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWebsiteFeedbackInputSchema.parse(body);
    const clientIp = resolveClientIp(req);
    enforceFeedbackRateLimit(`${clientIp}:${input.siteRef.hostname}`);

    const ctx = buildUseCaseContext(req);
    const result = await this.app.createFeedback.execute(input, ctx);
    return CreateWebsiteFeedbackOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("qa")
  @Header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=60")
  async listQa(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ListWebsiteQaInputSchema.parse({
      hostname: query.hostname,
      path: query.path,
      locale: query.locale,
      scope: query.scope,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicQa.execute(input, ctx);
    return ListWebsiteQaOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("wall-of-love")
  @Header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=60")
  async listWallOfLove(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ListPublicWebsiteWallOfLoveItemsInputSchema.parse({
      siteId: query.siteId,
      locale: query.locale,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPublicWallOfLoveItems.execute(input, ctx);
    return ListPublicWebsiteWallOfLoveItemsOutputSchema.parse(mapResultToHttp(result));
  }

  @Get("slug-exists")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=120")
  async slugExists(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = WebsiteSlugExistsInputSchema.parse({
      workspaceSlug: query.workspaceSlug,
      websiteSlug: query.websiteSlug,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.slugExists.execute(input, ctx);
    return WebsiteSlugExistsOutputSchema.parse(mapResultToHttp(result));
  }
}
