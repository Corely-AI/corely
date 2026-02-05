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
import { resolvePublicError } from "@/lib/public-errors";

export const CMS_REVALIDATE = 300;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getCmsListMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/cms",
  });

  return {
    title: "CMS",
    description: "Published posts from the Corely CMS.",
    alternates: {
      canonical,
    },
    openGraph: {
      title: "CMS",
      description: "Published posts from the Corely CMS.",
      url: canonical,
      type: "website",
    },
  };
}

export async function getCmsListPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}) {
  const { host, protocol } = input.ctx;
  const result = await publicApi
    .listBlogPosts({ workspaceSlug: input.workspaceSlug ?? null })
    .catch((error) => ({ error }));
  if ("error" in result) {
    const resolved = resolvePublicError(result.error);
    if (resolved?.kind === "disabled") {
      return { kind: "disabled", message: resolved.message } as const;
    }
    throw result.error;
  }

  const data = result;
  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/cms",
  });

  const collection = buildCollectionSchema({
    url: canonical,
    name: "CMS",
    description: "Published posts from the Corely CMS.",
    items: data.items.map((post) => ({
      name: post.title,
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: `/cms/${post.slug}`,
      }),
    })),
  });

  return { kind: "ok" as const, posts: data.items, collection };
}

export async function getCmsPostMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/cms/${input.slug}`,
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
  } catch (error) {
    const resolved = resolvePublicError(error);
    if (resolved?.kind === "disabled") {
      return {
        title: "Public site not published",
        description: resolved.message,
        alternates: { canonical },
      };
    }
    return { title: "Post not found", alternates: { canonical } };
  }
}

export async function getCmsPostPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}) {
  const { host, protocol } = input.ctx;
  const result = await publicApi
    .getBlogPost(input.slug, input.workspaceSlug ?? null)
    .catch((error) => ({ error }));
  if ("error" in result) {
    const resolved = resolvePublicError(result.error);
    if (resolved?.kind === "disabled") {
      return { kind: "disabled", message: resolved.message } as const;
    }
    if (resolved?.kind === "not-found") {
      notFound();
    }
    throw result.error;
  }

  const data = result;
  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/cms/${input.slug}`,
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
      answer: "Check the CMS archive for more posts and announcements.",
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
      name: "CMS",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/cms",
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
    speakable: ["/html/body/main/article/header/h1", "/html/body/main/article/section[1]/p"],
  });

  return {
    kind: "ok" as const,
    post,
    summary,
    bullets,
    faqs,
    breadcrumb,
    blogSchema,
    faqSchema: buildFaqSchema(faqs),
  };
}
