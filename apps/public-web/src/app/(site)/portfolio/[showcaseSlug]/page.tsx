import { PortfolioShowcaseContent } from "@/components/pages/portfolio-showcase-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  getPortfolioShowcaseMetadata,
  getPortfolioShowcasePageData,
} from "@/app/(site)/portfolio/_shared";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ showcaseSlug: string }> }) {
  const ctx = await getRequestContext();
  const { showcaseSlug } = await params;
  return getPortfolioShowcaseMetadata({ ctx, showcaseSlug });
}

export default async function PortfolioShowcasePage({
  params,
}: {
  params: Promise<{ showcaseSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { showcaseSlug } = await params;
  const result = await getPortfolioShowcasePageData({ ctx, showcaseSlug });
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
      />
    </>
  );
}
