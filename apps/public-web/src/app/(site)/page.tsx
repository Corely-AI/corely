import { JsonLd } from "@/components/seo/json-ld";
import { HomePageContent } from "@/components/pages/home-page";
import { getRequestContext } from "@/lib/request-context";
import { getHomeMetadata, getHomePageData } from "@/app/(site)/_home-shared";

export async function generateMetadata() {
  const ctx = getRequestContext();
  return getHomeMetadata({ ctx });
}

export default async function HomePage() {
  const ctx = getRequestContext();
  const { organizationSchema, websiteSchema } = await getHomePageData({ ctx });

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <HomePageContent />
    </>
  );
}
