import { unstable_noStore as noStore } from "next/cache";
import { getRequestContext } from "@/lib/request-context";
import { buildWebsitePathFromSegments, isPreviewMode } from "@/lib/website-routing";
import { getWebsitePageData, getWebsitePageMetadata } from "../_shared";
import { WebsitePublicPageScreen } from "@/components/pages/website-public-page";
import { WebsiteNotFound } from "@/components/website/website-not-found";
import { publicApi } from "@/lib/public-api";

export const revalidate = 120;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);
  const pathname = buildWebsitePathFromSegments(slug);

  return getWebsitePageMetadata({
    ctx,
    pathname,
    preview: previewMode,
    token: resolvedSearchParams?.token ?? null,
  });
}

export default async function WebsitePublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string }>;
}) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewMode = isPreviewMode(resolvedSearchParams?.preview);

  if (previewMode) {
    noStore();
  }

  const pathname = buildWebsitePathFromSegments(slug);
  const result = await getWebsitePageData({
    ctx,
    pathname,
    preview: previewMode,
    token: resolvedSearchParams?.token ?? null,
  });

  if (result.kind === "not-found") {
    return <WebsiteNotFound message={result.message} />;
  }
  if (result.kind === "unavailable") {
    return <WebsiteNotFound message={result.message ?? "Website is temporarily unavailable."} />;
  }

  let wallOfLoveItems: Awaited<ReturnType<typeof publicApi.listWallOfLoveItems>>["items"] = [];
  try {
    const wallOfLove = await publicApi.listWallOfLoveItems({
      siteId: result.page.siteId,
      locale: result.page.locale,
    });
    wallOfLoveItems = wallOfLove.items;
  } catch {
    wallOfLoveItems = [];
  }

  return (
    <WebsitePublicPageScreen
      page={result.page}
      host={ctx.host}
      previewMode={previewMode}
      wallOfLoveItems={wallOfLoveItems}
    />
  );
}
