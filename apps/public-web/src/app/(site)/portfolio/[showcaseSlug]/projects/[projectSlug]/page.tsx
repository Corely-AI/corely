import { PortfolioProjectContent } from "@/components/pages/portfolio-project-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  PORTFOLIO_REVALIDATE,
  getPortfolioProjectMetadata,
  getPortfolioProjectPageData,
} from "@/app/(site)/portfolio/_shared";

export const revalidate = PORTFOLIO_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showcaseSlug: string; projectSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { showcaseSlug, projectSlug } = await params;
  return getPortfolioProjectMetadata({
    ctx,
    showcaseSlug,
    projectSlug,
  });
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: Promise<{ showcaseSlug: string; projectSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { showcaseSlug, projectSlug } = await params;
  const result = await getPortfolioProjectPageData({
    ctx,
    showcaseSlug,
    projectSlug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.breadcrumb} />
      <JsonLd data={result.schema} />
      <PortfolioProjectContent project={result.project} showcaseSlug={showcaseSlug} />
    </>
  );
}
