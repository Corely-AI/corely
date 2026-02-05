import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
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
import { JsonLd } from "@/components/seo/json-ld";
import { HomePageContent } from "@/components/pages/home-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomeMetadata, getHomePageData } from "@/app/(site)/_home-shared";
import { WEBSITE_REVALIDATE } from "@/app/__website/_shared";

export const revalidate = WEBSITE_REVALIDATE;

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
    const { organizationSchema, websiteSchema } = await getHomePageData({
      ctx,
      workspaceSlug,
    });

    return (
      <div className="min-h-screen bg-background">
        <SiteHeader workspaceSlug={workspaceSlug} host={ctx.host} />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <JsonLd data={organizationSchema} />
          <JsonLd data={websiteSchema} />
          <HomePageContent workspaceSlug={workspaceSlug} />
        </main>
        <SiteFooter workspaceSlug={workspaceSlug} host={ctx.host} />
      </div>
    );
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
    throw error;
  }
}
