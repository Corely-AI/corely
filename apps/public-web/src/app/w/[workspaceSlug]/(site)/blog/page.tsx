import { BlogListContent } from "@/components/pages/blog-list-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getBlogListMetadata, getBlogListPageData } from "@/app/(site)/blog/_shared";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  return getBlogListMetadata({ ctx, workspaceSlug });
}

export default async function WorkspaceBlogPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const result = await getBlogListPageData({
    ctx,
    workspaceSlug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.collection} />
      <BlogListContent posts={result.posts} workspaceSlug={workspaceSlug} />
    </>
  );
}
