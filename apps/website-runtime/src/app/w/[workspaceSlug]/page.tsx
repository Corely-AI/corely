import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import type { ResolveWebsitePublicOutput } from "@corely/contracts";
import { getRequestContext } from "@/lib/request-context";
import { resolveWorkspaceSlugFromHost } from "@/lib/tenant";
import {
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
import { siteConfig } from "@/lib/site";

export const revalidate = 120;

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

const buildResolveRequest = (input: { host: string | null; acceptLanguage?: string | null }) => {
  const { path, locale: urlLocale } = splitLocaleFromPath("/");
  const headerLocale = resolveLocaleFromAcceptLanguage(input.acceptLanguage);
  return {
    host: input.host,
    path,
    locale: urlLocale ?? headerLocale ?? undefined,
  };
};

const buildWorkspaceHost = (workspaceSlug: string, host: string | null): string => {
  const hostSlug = host ? resolveWorkspaceSlugFromHost(host) : null;
  if (hostSlug && host) {
    return host;
  }
  return `${workspaceSlug}.${siteConfig.rootDomain}`;
};

const buildPreviewQuery = (params?: { preview?: string; token?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.preview) {
    searchParams.set("preview", params.preview);
  }
  if (params?.token) {
    searchParams.set("token", params.token);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);

  const isWorkspaceHost = Boolean(resolveWorkspaceSlugFromHost(ctx.host));
  const resolved = buildResolveRequest({ host: ctx.host, acceptLanguage: ctx.acceptLanguage });
  const hostForResolve = isWorkspaceHost
    ? (resolved.host ?? "")
    : buildWorkspaceHost(workspaceSlug, ctx.host);
  const canonical = resolveCanonicalUrl({
    host: ctx.host,
    protocol: ctx.protocol,
    workspaceSlug,
    path: "/",
  });

  try {
    const output = await publicApi.resolveWebsitePage({
      host: hostForResolve,
      path: resolved.path,
      locale: resolved.locale,
      mode: previewMode ? "preview" : "live",
      token: resolvedSearchParams?.token ?? undefined,
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

export default async function WorkspaceRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);

  if (previewMode) {
    noStore();
  }

  const isWorkspaceHost = Boolean(resolveWorkspaceSlugFromHost(ctx.host));
  if (!isWorkspaceHost) {
    const resolved = buildResolveRequest({ host: ctx.host, acceptLanguage: ctx.acceptLanguage });
    const fallbackHost = buildWorkspaceHost(workspaceSlug, ctx.host);

    try {
      const output = await publicApi.resolveWebsitePage({
        host: fallbackHost,
        path: resolved.path,
        locale: resolved.locale,
        mode: previewMode ? "preview" : "live",
        token: resolvedSearchParams?.token ?? undefined,
      });

      redirect(`/w/${workspaceSlug}/${output.siteSlug}${buildPreviewQuery(resolvedSearchParams)}`);
    } catch (error) {
      const resolvedError = resolveWebsiteError(error);
      if (resolvedError?.kind === "not-found") {
        return <WebsiteNotFound message={resolvedError.message} />;
      }
      if (resolvedError?.kind === "unavailable") {
        return (
          <WebsiteNotFound
            message={resolvedError.message ?? "Website is temporarily unavailable."}
          />
        );
      }
      throw error;
    }
  }

  const resolved = buildResolveRequest({ host: ctx.host, acceptLanguage: ctx.acceptLanguage });

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host ?? "",
      path: resolved.path,
      locale: resolved.locale,
      mode: previewMode ? "preview" : "live",
      token: resolvedSearchParams?.token ?? undefined,
    });

    return <WebsitePublicPageScreen page={output} host={ctx.host} previewMode={previewMode} />;
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
