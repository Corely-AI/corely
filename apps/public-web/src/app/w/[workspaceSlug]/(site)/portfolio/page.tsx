import { PortfolioListContent } from "@/components/pages/portfolio-list-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  PORTFOLIO_REVALIDATE,
  getPortfolioListMetadata,
  getPortfolioListPageData,
} from "@/app/(site)/portfolio/_shared";

export const revalidate = PORTFOLIO_REVALIDATE;

export async function generateMetadata({ params }: { params: { workspaceSlug: string } }) {
  const ctx = getRequestContext();
  return getPortfolioListMetadata({ ctx, workspaceSlug: params.workspaceSlug });
}

export default async function WorkspacePortfolioPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  const ctx = getRequestContext();
  const { showcases, collection } = await getPortfolioListPageData({
    ctx,
    workspaceSlug: params.workspaceSlug,
  });

  return (
    <>
      <JsonLd data={collection} />
      <PortfolioListContent showcases={showcases} workspaceSlug={params.workspaceSlug} />
    </>
  );
}
