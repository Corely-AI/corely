import { PortfolioListContent } from "@/components/pages/portfolio-list-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getPortfolioListMetadata, getPortfolioListPageData } from "@/app/(site)/portfolio/_shared";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  return getPortfolioListMetadata({ ctx, workspaceSlug });
}

export default async function WorkspacePortfolioPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const result = await getPortfolioListPageData({
    ctx,
    workspaceSlug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.collection} />
      <PortfolioListContent showcases={result.showcases} workspaceSlug={workspaceSlug} />
    </>
  );
}
