import { BlogListContent } from "@/components/pages/blog-list-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getCmsListMetadata, getCmsListPageData } from "@/app/(site)/cms/_shared";

export const revalidate = 300;

export async function generateMetadata() {
  const ctx = await getRequestContext();
  return getCmsListMetadata({ ctx });
}

export default async function CmsPage() {
  const ctx = await getRequestContext();
  const result = await getCmsListPageData({ ctx });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.collection} />
      <BlogListContent posts={result.posts} />
    </>
  );
}
