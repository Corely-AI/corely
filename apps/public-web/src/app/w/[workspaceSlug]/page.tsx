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
import { getHomeMetadata } from "@/app/(site)/_home-shared";

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
  if (!isWorkspaceHost) {
    return getHomeMetadata({ ctx, workspaceSlug });
  }

  const resolved = buildResolveRequest({ host: ctx.host, acceptLanguage: ctx.acceptLanguage });
  const canonical = resolveCanonicalUrl({
    host: ctx.host,
    protocol: ctx.protocol,
    workspaceSlug,
    path: "/",
  });

  try {
    const output = await publicApi.resolveWebsitePage({
      host: resolved.host ?? "",
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

    let wallOfLoveItems: Awaited<ReturnType<typeof publicApi.listWallOfLoveItems>>["items"] = [];
    try {
      const wallOfLove = await publicApi.listWallOfLoveItems({
        siteId: output.siteId,
        locale: output.locale,
      });
      wallOfLoveItems = wallOfLove.items;
    } catch {
      wallOfLoveItems = [];
    }

    return (
      <WebsitePublicPageScreen
        page={output}
        host={ctx.host}
        previewMode={previewMode}
        wallOfLoveItems={wallOfLoveItems}
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
