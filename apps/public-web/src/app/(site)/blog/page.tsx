import { BlogListContent } from "@/components/pages/blog-list-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  BLOG_REVALIDATE,
  getBlogListMetadata,
  getBlogListPageData,
} from "@/app/(site)/blog/_shared";

export const revalidate = BLOG_REVALIDATE;

export async function generateMetadata() {
  const ctx = getRequestContext();
  return getBlogListMetadata({ ctx });
}

export default async function BlogPage() {
  const ctx = getRequestContext();
  const { posts, collection } = await getBlogListPageData({ ctx });

  return (
    <>
      <JsonLd data={collection} />
      <BlogListContent posts={posts} />
    </>
  );
}
