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
  ResolveWebsitePublicSiteSettingsInputSchema,
  ResolveWebsitePublicSiteSettingsOutputSchema,
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

const resolvePublicBaseUrl = (req: Request): string => {
  const origin = req.get("origin");
  if (origin && origin.length > 0) {
    return origin.replace(/\/$/, "");
  }

  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;
  const protocol =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0]!.trim()
      : req.protocol;

  const host = req.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`.replace(/\/$/, "");
};

const toAbsoluteUrl = (baseUrl: string, pathOrUrl: string): string =>
  /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

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

  @Get("settings")
  @Header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=60")
  async resolveSettings(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ResolveWebsitePublicSiteSettingsInputSchema.parse({
      siteId: query.siteId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.resolvePublicSiteSettings.execute(input, ctx);
    return ResolveWebsitePublicSiteSettingsOutputSchema.parse(mapResultToHttp(result));
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
      siteId: query.siteId,
      hostname: query.hostname,
      path: query.path,
      locale: query.locale,
      scope: query.scope,
      pageId: query.pageId,
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

    const output = mapResultToHttp(result);
    const baseUrl = resolvePublicBaseUrl(req);
    const items = output.items.map((item) => ({
      ...item,
      imageUrl:
        item.type === "image" && item.imageUrl ? toAbsoluteUrl(baseUrl, item.imageUrl) : undefined,
    }));

    return ListPublicWebsiteWallOfLoveItemsOutputSchema.parse({ items });
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
