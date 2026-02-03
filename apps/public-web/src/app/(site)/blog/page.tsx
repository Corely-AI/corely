import { BlogListContent } from "@/components/pages/blog-list-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getBlogListMetadata, getBlogListPageData } from "@/app/(site)/blog/_shared";

export const revalidate = 300;

export async function generateMetadata() {
  const ctx = await getRequestContext();
  return getBlogListMetadata({ ctx });
}

export default async function BlogPage() {
  const ctx = await getRequestContext();
  const result = await getBlogListPageData({ ctx });
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
