import { CmsPageContent } from "@/components/pages/cms-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { CMS_REVALIDATE, getCmsPageMetadata, getCmsPageData } from "@/app/(site)/pages/_shared";

export const revalidate = CMS_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  return getCmsPageMetadata({
    ctx,
    workspaceSlug,
    slug,
  });
}

export default async function WorkspaceCmsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  const result = await getCmsPageData({
    ctx,
    workspaceSlug,
    slug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.breadcrumb} />
      <JsonLd data={result.schema} />
      <CmsPageContent page={result.page} workspaceSlug={workspaceSlug} />
    </>
  );
}
