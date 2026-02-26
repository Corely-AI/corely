import type { Metadata } from "next";
import type { ResolveWebsitePublicOutput } from "@corely/contracts";
import { publicApi, buildPublicFileUrl } from "@/lib/public-api";
import { resolveSiteOrigin } from "@/lib/urls";
import {
  normalizeWebsitePath,
  resolveLocaleFromAcceptLanguage,
  splitLocaleFromPath,
} from "@/lib/website-routing";
import { resolveWebsiteError } from "@/lib/website-errors";
import { extractCmsPayloadMeta, extractTextPayload } from "@/lib/website-payload";

export const WEBSITE_REVALIDATE = 120;

type RequestContext = {
  host: string | null;
  protocol: string | null;
  acceptLanguage?: string | null;
};

type WebsiteResolveRequest = {
  host: string;
  path: string;
  locale?: string;
  canonicalPath: string;
};

const buildResolveRequest = (input: {
  ctx: RequestContext;
  pathname: string;
}): WebsiteResolveRequest | null => {
  const { host } = input.ctx;
  if (!host) {
    return null;
  }

  const canonicalPath = normalizeWebsitePath(input.pathname);
  const { path, locale: urlLocale } = splitLocaleFromPath(canonicalPath);
  const headerLocale = resolveLocaleFromAcceptLanguage(input.ctx.acceptLanguage);

  return {
    host,
    path,
    locale: urlLocale ?? headerLocale ?? undefined,
    canonicalPath,
  };
};

const resolveMetadataFallback = (input: {
  canonical: string;
  title?: string;
  description?: string | null;
  imageFileId?: string | null;
  ogTitle?: string;
  ogDescription?: string | null;
  ogImageFileId?: string | null;
}): Metadata => {
  const ogImageFileId = input.ogImageFileId ?? input.imageFileId;
  const ogImage = ogImageFileId ? buildPublicFileUrl(ogImageFileId) : undefined;
  const description = input.description ?? undefined;
  const ogDescription = input.ogDescription ?? description;
  const ogTitle = input.ogTitle ?? input.title ?? "Website";

  return {
    title: input.title ?? "Website",
    description,
    alternates: { canonical: input.canonical },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: input.canonical,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
  };
};

const resolveSeoFallback = (
  output: ResolveWebsitePublicOutput
): {
  title?: string;
  description?: string | null;
  imageFileId?: string | null;
  ogTitle?: string;
  ogDescription?: string | null;
  ogImageFileId?: string | null;
} => {
  const meta = extractCmsPayloadMeta(output.payloadJson);
  const text = extractTextPayload(output.payloadJson);
  const override = output.page.content.seoOverride;
  const title =
    override?.title ??
    output.seo?.title ??
    meta?.title ??
    output.settings.common.siteTitle ??
    undefined;
  const description =
    override?.description ??
    output.seo?.description ??
    meta?.excerpt ??
    output.settings.common.seoDefaults.defaultDescription ??
    (text ? text.slice(0, 155) : undefined);
  const imageFileId = override?.imageFileId ?? output.seo?.imageFileId ?? null;
  const ogTitle = override?.ogTitle ?? override?.title ?? title;
  const ogDescription = override?.ogDescription ?? override?.description ?? description;
  const ogImageFileId = override?.ogImageFileId ?? override?.imageFileId ?? imageFileId;

  return {
    title,
    description: description ?? null,
    imageFileId,
    ogTitle,
    ogDescription: ogDescription ?? null,
    ogImageFileId,
  };
};

export async function getWebsitePageMetadata(input: {
  ctx: RequestContext;
  pathname: string;
  preview?: boolean;
  token?: string | null;
}): Promise<Metadata> {
  const resolved = buildResolveRequest({ ctx: input.ctx, pathname: input.pathname });
  const canonical = `${resolveSiteOrigin({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
  })}${resolved?.canonicalPath ?? normalizeWebsitePath(input.pathname)}`;

  if (!resolved) {
    return resolveMetadataFallback({ canonical, title: "Website" });
  }

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host,
      path: resolved.path,
      locale: resolved.locale,
      mode: input.preview ? "preview" : "live",
      token: input.token ?? undefined,
    });

    const fallback = resolveSeoFallback(output);
    return resolveMetadataFallback({ canonical, ...fallback });
  } catch (error) {
    const resolvedError = resolveWebsiteError(error);
    if (resolvedError?.kind === "not-found") {
      return resolveMetadataFallback({ canonical, title: "Page not found" });
    }
    if (resolvedError?.kind === "unavailable") {
      return resolveMetadataFallback({ canonical, title: "Website unavailable" });
    }
    return resolveMetadataFallback({ canonical, title: "Website" });
  }
}

export async function getWebsitePageData(input: {
  ctx: RequestContext;
  pathname: string;
  preview?: boolean;
  token?: string | null;
}) {
  const resolved = buildResolveRequest({ ctx: input.ctx, pathname: input.pathname });
  if (!resolved) {
    return {
      kind: "not-found" as const,
      message: "Host is missing from the request.",
      canonicalPath: normalizeWebsitePath(input.pathname),
    };
  }

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host,
      path: resolved.path,
      locale: resolved.locale,
      mode: input.preview ? "preview" : "live",
      token: input.token ?? undefined,
    });

    return {
      kind: "ok" as const,
      page: output,
      canonicalPath: resolved.canonicalPath,
      locale: output.locale,
    };
  } catch (error) {
    const resolvedError = resolveWebsiteError(error);
    if (resolvedError?.kind === "not-found") {
      return {
        kind: "not-found" as const,
        message: resolvedError.message,
        canonicalPath: resolved.canonicalPath,
      };
    }
    if (resolvedError?.kind === "unavailable") {
      return {
        kind: "unavailable" as const,
        message: resolvedError.message ?? "Website is temporarily unavailable.",
        canonicalPath: resolved.canonicalPath,
      };
    }
    throw error;
  }
}
