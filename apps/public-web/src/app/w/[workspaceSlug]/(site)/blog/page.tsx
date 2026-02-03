import { BlogListContent } from "@/components/pages/blog-list-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  BLOG_REVALIDATE,
  getBlogListMetadata,
  getBlogListPageData,
} from "@/app/(site)/blog/_shared";

export const revalidate = BLOG_REVALIDATE;

export async function generateMetadata({ params }: { params: { workspaceSlug: string } }) {
  const ctx = getRequestContext();
  return getBlogListMetadata({ ctx, workspaceSlug: params.workspaceSlug });
}

export default async function WorkspaceBlogPage({ params }: { params: { workspaceSlug: string } }) {
  const ctx = getRequestContext();
  const { posts, collection } = await getBlogListPageData({
    ctx,
    workspaceSlug: params.workspaceSlug,
  });

  return (
    <>
      <JsonLd data={collection} />
      <BlogListContent posts={posts} workspaceSlug={params.workspaceSlug} />
    </>
  );
}
