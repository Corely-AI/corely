import { JsonLd } from "@/components/seo/json-ld";
import { HomePageContent } from "@/components/pages/home-page";
import { getRequestContext } from "@/lib/request-context";
import { getHomeMetadata, getHomePageData } from "@/app/(site)/_home-shared";

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  return getHomeMetadata({ ctx, workspaceSlug });
}

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const { organizationSchema, websiteSchema } = await getHomePageData({
    ctx,
    workspaceSlug,
  });

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <HomePageContent workspaceSlug={workspaceSlug} />
    </>
  );
}
