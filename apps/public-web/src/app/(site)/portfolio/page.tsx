import { PortfolioListContent } from "@/components/pages/portfolio-list-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getPortfolioListMetadata, getPortfolioListPageData } from "@/app/(site)/portfolio/_shared";

export const revalidate = 300;

export async function generateMetadata() {
  const ctx = await getRequestContext();
  return getPortfolioListMetadata({ ctx });
}

export default async function PortfolioPage() {
  const ctx = await getRequestContext();
  const result = await getPortfolioListPageData({ ctx });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.collection} />
      <PortfolioListContent showcases={result.showcases} />
    </>
  );
}
