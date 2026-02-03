import { CmsPageContent } from "@/components/pages/cms-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getCmsPageMetadata, getCmsPageData } from "@/app/(site)/pages/_shared";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  return getCmsPageMetadata({ ctx, slug });
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  const result = await getCmsPageData({ ctx, slug });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.breadcrumb} />
      <JsonLd data={result.schema} />
      <CmsPageContent page={result.page} />
    </>
  );
}
