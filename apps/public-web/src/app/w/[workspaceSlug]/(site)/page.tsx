import { JsonLd } from "@/components/seo/json-ld";
import { HomePageContent } from "@/components/pages/home-page";
import { getRequestContext } from "@/lib/request-context";
import { getHomeMetadata, getHomePageData } from "@/app/(site)/_home-shared";

export async function generateMetadata({ params }: { params: { workspaceSlug: string } }) {
  const ctx = getRequestContext();
  return getHomeMetadata({ ctx, workspaceSlug: params.workspaceSlug });
}

export default async function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  const ctx = getRequestContext();
  const { organizationSchema, websiteSchema } = await getHomePageData({
    ctx,
    workspaceSlug: params.workspaceSlug,
  });

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <HomePageContent workspaceSlug={params.workspaceSlug} />
    </>
  );
}
