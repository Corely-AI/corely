import { BlogPostContent } from "@/components/pages/blog-post-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import {
  BLOG_REVALIDATE,
  getBlogPostMetadata,
  getBlogPostPageData,
} from "@/app/(site)/blog/_shared";

export const revalidate = BLOG_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  return getBlogPostMetadata({
    ctx,
    workspaceSlug: params.workspaceSlug,
    slug: params.slug,
  });
}

export default async function WorkspaceBlogPostPage({
  params,
}: {
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  const { post, summary, bullets, faqs, breadcrumb, blogSchema, faqSchema } =
    await getBlogPostPageData({
      ctx,
      workspaceSlug: params.workspaceSlug,
      slug: params.slug,
    });

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={blogSchema} />
      <JsonLd data={faqSchema} />
      <BlogPostContent
        post={post}
        summary={summary}
        bullets={bullets}
        faqs={faqs}
        workspaceSlug={params.workspaceSlug}
      />
    </>
  );
}
