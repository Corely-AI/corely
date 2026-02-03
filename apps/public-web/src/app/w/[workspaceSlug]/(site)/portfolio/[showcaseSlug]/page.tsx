import { PortfolioShowcaseContent } from "@/components/pages/portfolio-showcase-page";
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
  params: { workspaceSlug: string; showcaseSlug: string };
}) {
  const ctx = getRequestContext();
  return getPortfolioShowcaseMetadata({
    ctx,
    workspaceSlug: params.workspaceSlug,
    showcaseSlug: params.showcaseSlug,
  });
}

export default async function WorkspacePortfolioShowcasePage({
  params,
}: {
  params: { workspaceSlug: string; showcaseSlug: string };
}) {
  const ctx = getRequestContext();
  const {
    showcase,
    profile,
    featuredProjects,
    featuredClients,
    featuredServices,
    featuredTeamMembers,
    breadcrumb,
    schema,
  } = await getPortfolioShowcasePageData({
    ctx,
    workspaceSlug: params.workspaceSlug,
    showcaseSlug: params.showcaseSlug,
  });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={schema} />
      <PortfolioShowcaseContent
        showcase={showcase}
        profile={profile}
        featuredProjects={featuredProjects}
        featuredClients={featuredClients}
        featuredServices={featuredServices}
        featuredTeamMembers={featuredTeamMembers}
        workspaceSlug={params.workspaceSlug}
      />
    </>
  );
}
