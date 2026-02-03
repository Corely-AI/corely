import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";
import { resolveCanonicalUrl } from "@/lib/urls";
import { buildWebPageSchema, buildBreadcrumbList } from "@/lib/structured-data";
import { resolvePublicError } from "@/lib/public-errors";

export const CMS_REVALIDATE = 300;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getCmsPageMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/pages/${input.slug}`,
  });

  try {
    const data = await publicApi.getPage(input.slug, input.workspaceSlug ?? null);
    const page = data.post;

    return {
      title: page.title,
      description: page.excerpt ?? page.contentText.slice(0, 160),
      alternates: {
        canonical,
      },
      openGraph: {
        title: page.title,
        description: page.excerpt ?? page.contentText.slice(0, 160),
        url: canonical,
        type: "article",
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
    return { title: "Page not found", alternates: { canonical } };
  }
}

export async function getCmsPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}) {
  const { host, protocol } = input.ctx;
  const result = await publicApi
    .getPage(input.slug, input.workspaceSlug ?? null)
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
    path: `/pages/${input.slug}`,
  });

  const page = data.post;
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
    { name: page.title, url: canonical },
  ]);

  const schema = buildWebPageSchema({
    url: canonical,
    name: page.title,
    description: page.excerpt ?? page.contentText.slice(0, 160),
  });

  return { kind: "ok" as const, page, breadcrumb, schema };
}
