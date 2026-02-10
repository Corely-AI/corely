import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { ResolveWebsitePublicOutput } from "@corely/contracts";
import { getRequestContext } from "@/lib/request-context";
import {
  buildWebsitePathFromSegments,
  isPreviewMode,
  resolveLocaleFromAcceptLanguage,
  splitLocaleFromPath,
} from "@/lib/website-routing";
import { publicApi, buildPublicFileUrl } from "@/lib/public-api";
import { resolveWebsiteError } from "@/lib/website-errors";
import { extractCmsPayloadMeta, extractTextPayload } from "@/lib/website-payload";
import { resolveCanonicalUrl } from "@/lib/urls";
import { WebsitePublicPageScreen } from "@/components/pages/website-public-page";
import { WebsiteNotFound } from "@/components/website/website-not-found";
import { resolveWorkspaceSlugFromHost } from "@/lib/tenant";
import { siteConfig } from "@/lib/site";

export const revalidate = 120;

const resolveMetadataFallback = (input: {
  canonical: string;
  title?: string;
  description?: string | null;
  imageFileId?: string | null;
}): Metadata => {
  const ogImage = input.imageFileId ? buildPublicFileUrl(input.imageFileId) : undefined;
  const description = input.description ?? undefined;

  return {
    title: input.title ?? "Website",
    description,
    alternates: { canonical: input.canonical },
    openGraph: {
      title: input.title ?? "Website",
      description,
      url: input.canonical,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
  };
};

const resolveSeoFallback = (
  output: ResolveWebsitePublicOutput
): { title?: string; description?: string | null } => {
  const meta = extractCmsPayloadMeta(output.payloadJson);
  const text = extractTextPayload(output.payloadJson);
  const title = output.seo?.title ?? meta?.title ?? undefined;
  const description =
    output.seo?.description ?? meta?.excerpt ?? (text ? text.slice(0, 155) : undefined);
  return { title, description: description ?? null };
};

const buildWorkspaceHost = (workspaceSlug: string, host: string | null): string => {
  const hostSlug = host ? resolveWorkspaceSlugFromHost(host) : null;
  if (hostSlug && host) {
    return host;
  }
  return `${workspaceSlug}.${siteConfig.rootDomain}`;
};

const resolveWebsiteRouting = async (input: {
  workspaceSlug: string;
  websiteSlug: string;
  segments?: string[];
  host: string | null;
  acceptLanguage?: string | null;
}) => {
  const isWorkspaceHost = Boolean(resolveWorkspaceSlugFromHost(input.host));
  const fallbackHost = buildWorkspaceHost(input.workspaceSlug, input.host);
  let slugLookup: { exists: boolean; isDefault?: boolean } | null = null;
  if (isWorkspaceHost) {
    slugLookup = await publicApi.websiteSlugExists({
      workspaceSlug: input.workspaceSlug,
      websiteSlug: input.websiteSlug,
    });
  }

  const websiteSlugIsSite = !isWorkspaceHost || Boolean(slugLookup?.exists);
  const pageSegments = websiteSlugIsSite
    ? (input.segments ?? [])
    : [input.websiteSlug, ...(input.segments ?? [])];
  const pagePathWithLocale = buildWebsitePathFromSegments(pageSegments);
  const { path: pagePath, locale: urlLocale } = splitLocaleFromPath(pagePathWithLocale);
  const headerLocale = resolveLocaleFromAcceptLanguage(input.acceptLanguage);
  const resolvedLocale = urlLocale ?? headerLocale ?? undefined;

  const apiPath = websiteSlugIsSite
    ? pagePath === "/"
      ? `/${input.websiteSlug}`
      : `/${input.websiteSlug}${pagePath}`
    : pagePath;

  const canonicalPath =
    slugLookup?.exists && slugLookup.isDefault
      ? buildWebsitePathFromSegments(input.segments)
      : buildWebsitePathFromSegments([input.websiteSlug, ...(input.segments ?? [])]);

  if (!isWorkspaceHost) {
    return {
      host: fallbackHost,
      path: apiPath,
      canonicalPath,
      locale: resolvedLocale,
      basePath: `/w/${input.workspaceSlug}/${input.websiteSlug}`,
      shouldRedirectToDefault: false,
    };
  }

  return {
    host: input.host ?? fallbackHost,
    path: apiPath,
    canonicalPath,
    locale: resolvedLocale,
    basePath: slugLookup?.exists && !slugLookup.isDefault ? `/${input.websiteSlug}` : undefined,
    shouldRedirectToDefault: Boolean(slugLookup?.exists && slugLookup.isDefault),
  };
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; websiteSlug: string; slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, websiteSlug, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);

  const resolved = await resolveWebsiteRouting({
    workspaceSlug,
    websiteSlug,
    segments: slug,
    host: ctx.host,
    acceptLanguage: ctx.acceptLanguage,
  });

  const canonical = resolveCanonicalUrl({
    host: ctx.host,
    protocol: ctx.protocol,
    workspaceSlug,
    path: resolved.canonicalPath,
  });

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host,
      path: resolved.path,
      locale: resolved.locale,
      mode: previewMode ? "preview" : "live",
      token: resolvedSearchParams?.token ?? undefined,
    });

    const fallback = resolveSeoFallback(output);
    return resolveMetadataFallback({
      canonical,
      title: output.seo?.title ?? fallback.title,
      description: output.seo?.description ?? fallback.description,
      imageFileId: output.seo?.imageFileId ?? undefined,
    });
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

export default async function WorkspaceWebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; websiteSlug: string; slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, websiteSlug, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);

  if (previewMode) {
    noStore();
  }

  const resolved = await resolveWebsiteRouting({
    workspaceSlug,
    websiteSlug,
    segments: slug,
    host: ctx.host,
    acceptLanguage: ctx.acceptLanguage,
  });

  if (resolved.shouldRedirectToDefault) {
    redirect(resolved.canonicalPath);
  }

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host,
      path: resolved.path,
      locale: resolved.locale,
      mode: previewMode ? "preview" : "live",
      token: resolvedSearchParams?.token ?? undefined,
    });

    return (
      <WebsitePublicPageScreen
        page={output}
        host={ctx.host ?? resolved.host}
        previewMode={previewMode}
        basePath={resolved.basePath}
      />
    );
  } catch (error) {
    const resolvedError = resolveWebsiteError(error);
    if (resolvedError?.kind === "not-found") {
      return <WebsiteNotFound message={resolvedError.message} />;
    }
    if (resolvedError?.kind === "unavailable") {
      return (
        <WebsiteNotFound message={resolvedError.message ?? "Website is temporarily unavailable."} />
      );
    }
    throw error;
  }
}
