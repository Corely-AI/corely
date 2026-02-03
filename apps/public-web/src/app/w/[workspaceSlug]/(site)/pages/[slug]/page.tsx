import { CmsPageContent } from "@/components/pages/cms-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { CMS_REVALIDATE, getCmsPageMetadata, getCmsPageData } from "@/app/(site)/pages/_shared";

export const revalidate = CMS_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  return getCmsPageMetadata({
    ctx,
    workspaceSlug: params.workspaceSlug,
    slug: params.slug,
  });
}

export default async function WorkspaceCmsPage({
  params,
}: {
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  const { page, breadcrumb, schema } = await getCmsPageData({
    ctx,
    workspaceSlug: params.workspaceSlug,
    slug: params.slug,
  });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={schema} />
      <CmsPageContent page={page} workspaceSlug={params.workspaceSlug} />
    </>
  );
}
