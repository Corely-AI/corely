import { BlogPostContent } from "@/components/pages/blog-post-page";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { getCmsPostMetadata, getCmsPostPageData } from "@/app/(site)/cms/_shared";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  return getCmsPostMetadata({ ctx, workspaceSlug, slug });
}

export default async function WorkspaceCmsPostPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  const result = await getCmsPostPageData({ ctx, workspaceSlug, slug });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <>
      <JsonLd data={result.blogSchema} />
      <JsonLd data={result.faqSchema} />
      <BlogPostContent
        post={result.post}
        summary={result.summary}
        bullets={result.bullets}
        faqs={result.faqs}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
}
