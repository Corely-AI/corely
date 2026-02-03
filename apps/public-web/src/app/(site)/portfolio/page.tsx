import { PortfolioListContent } from "@/components/pages/portfolio-list-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  PORTFOLIO_REVALIDATE,
  getPortfolioListMetadata,
  getPortfolioListPageData,
} from "@/app/(site)/portfolio/_shared";

export const revalidate = PORTFOLIO_REVALIDATE;

export async function generateMetadata() {
  const ctx = getRequestContext();
  return getPortfolioListMetadata({ ctx });
}

export default async function PortfolioPage() {
  const ctx = getRequestContext();
  const { showcases, collection } = await getPortfolioListPageData({ ctx });

  return (
    <>
      <JsonLd data={collection} />
      <PortfolioListContent showcases={showcases} />
    </>
  );
}
