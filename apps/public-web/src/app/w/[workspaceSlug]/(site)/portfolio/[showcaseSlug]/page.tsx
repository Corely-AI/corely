import { PortfolioShowcaseContent } from "@/components/pages/portfolio-showcase-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  PORTFOLIO_REVALIDATE,
  getPortfolioShowcaseMetadata,
  getPortfolioShowcasePageData,
} from "@/app/(site)/portfolio/_shared";

export const revalidate = PORTFOLIO_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; showcaseSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, showcaseSlug } = await params;
  return getPortfolioShowcaseMetadata({
    ctx,
    workspaceSlug,
    showcaseSlug,
  });
}

export default async function WorkspacePortfolioShowcasePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; showcaseSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, showcaseSlug } = await params;
  const result = await getPortfolioShowcasePageData({
    ctx,
    workspaceSlug,
    showcaseSlug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.breadcrumb} />
      <JsonLd data={result.schema} />
      <PortfolioShowcaseContent
        showcase={result.showcase}
        profile={result.profile}
        featuredProjects={result.featuredProjects}
        featuredClients={result.featuredClients}
        featuredServices={result.featuredServices}
        featuredTeamMembers={result.featuredTeamMembers}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
}
