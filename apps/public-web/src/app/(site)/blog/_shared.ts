import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi, buildPublicFileUrl } from "@/lib/public-api";
import { resolveCanonicalUrl } from "@/lib/urls";
import {
  buildCollectionSchema,
  buildBlogPostingSchema,
  buildBreadcrumbList,
  buildFaqSchema,
} from "@/lib/structured-data";
import { buildBulletList, buildSummary } from "@/lib/summary";

export const BLOG_REVALIDATE = 300;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getBlogListMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/blog",
  });

  return {
    title: "Blog",
    description: "Published posts from the Corely CMS.",
    alternates: {
      canonical,
    },
    openGraph: {
      title: "Blog",
      description: "Published posts from the Corely CMS.",
      url: canonical,
      type: "website",
    },
  };
}

export async function getBlogListPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}) {
  const { host, protocol } = input.ctx;
  const data = await publicApi.listBlogPosts({ workspaceSlug: input.workspaceSlug ?? null });
  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/blog",
  });

  const collection = buildCollectionSchema({
    url: canonical,
    name: "Blog",
    description: "Published posts from the Corely CMS.",
    items: data.items.map((post) => ({
      name: post.title,
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: `/blog/${post.slug}`,
      }),
    })),
  });

  return { posts: data.items, collection };
}

export async function getBlogPostMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/blog/${input.slug}`,
  });

  try {
    const data = await publicApi.getBlogPost(input.slug, input.workspaceSlug ?? null);
    const post = data.post;
    const ogImage = post.coverImageFileId ? buildPublicFileUrl(post.coverImageFileId) : undefined;

    return {
      title: post.title,
      description: post.excerpt ?? post.contentText.slice(0, 160),
      alternates: {
        canonical,
      },
      openGraph: {
        title: post.title,
        description: post.excerpt ?? post.contentText.slice(0, 160),
        url: canonical,
        type: "article",
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return {
      title: "Post not found",
      alternates: { canonical },
    };
  }
}

export async function getBlogPostPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}) {
  const { host, protocol } = input.ctx;
  const data = await publicApi
    .getBlogPost(input.slug, input.workspaceSlug ?? null)
    .catch(() => null);
  if (!data) {
    notFound();
  }

  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/blog/${input.slug}`,
  });

  const post = data.post;
  const summary = buildSummary({
    excerpt: post.excerpt,
    contentText: post.contentText,
    fallback: "Explore the latest insights from this workspace.",
    maxSentences: 3,
  });
  const bullets = buildBulletList([
    post.publishedAt ? `Published ${new Date(post.publishedAt).toLocaleDateString()}` : null,
    post.updatedAt ? `Updated ${new Date(post.updatedAt).toLocaleDateString()}` : null,
    post.tags?.length ? `Tags: ${post.tags.join(", ")}` : null,
  ]);
  const faqs = [
    {
      question: "What is the main takeaway?",
      answer: summary,
    },
    {
      question: "Where can I find more updates?",
      answer: "Check the blog archive for more posts and announcements.",
    },
  ];

  const breadcrumb = buildBreadcrumbList([
    {
      name: "Home",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/",
      }),
    },
    {
      name: "Blog",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/blog",
      }),
    },
    { name: post.title, url: canonical },
  ]);

  const blogSchema = buildBlogPostingSchema({
    baseUrl: new URL(canonical).origin,
    title: post.title,
    description: post.excerpt ?? summary,
    url: canonical,
    imageUrl: post.coverImageFileId ? buildPublicFileUrl(post.coverImageFileId) : null,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt ?? undefined,
    authorName: post.authorUserId,
    speakable: ["/html/body/main/article/header/h1", "/html/body/main/article/section[1]/p"],
  });

  return {
    post,
    summary,
    bullets,
    faqs,
    breadcrumb,
    blogSchema,
    faqSchema: buildFaqSchema(faqs),
  };
}
