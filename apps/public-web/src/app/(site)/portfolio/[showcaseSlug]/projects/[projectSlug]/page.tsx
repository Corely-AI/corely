import { PortfolioProjectContent } from "@/components/pages/portfolio-project-page";
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
  params: { showcaseSlug: string; projectSlug: string };
}) {
  const ctx = getRequestContext();
  return getPortfolioProjectMetadata({
    ctx,
    showcaseSlug: params.showcaseSlug,
    projectSlug: params.projectSlug,
  });
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: { showcaseSlug: string; projectSlug: string };
}) {
  const ctx = getRequestContext();
  const { project, breadcrumb, schema } = await getPortfolioProjectPageData({
    ctx,
    showcaseSlug: params.showcaseSlug,
    projectSlug: params.projectSlug,
  });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={schema} />
      <PortfolioProjectContent project={project} showcaseSlug={params.showcaseSlug} />
    </>
  );
}
