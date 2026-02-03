import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";
import { resolveCanonicalUrl } from "@/lib/urls";
import {
  buildCollectionSchema,
  buildBreadcrumbList,
  buildWebPageSchema,
} from "@/lib/structured-data";

export const PORTFOLIO_REVALIDATE = 300;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getPortfolioListMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/portfolio",
  });

  return {
    title: "Portfolio",
    description: "Public portfolio showcases.",
    alternates: { canonical },
    openGraph: {
      title: "Portfolio",
      description: "Public portfolio showcases.",
      url: canonical,
      type: "website",
    },
  };
}

export async function getPortfolioListPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}) {
  const { host, protocol } = input.ctx;
  const data = await publicApi.listPortfolioShowcases({
    workspaceSlug: input.workspaceSlug ?? null,
  });
  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/portfolio",
  });

  const collection = buildCollectionSchema({
    url: canonical,
    name: "Portfolio",
    description: "Public portfolio showcases.",
    items: data.items.map((showcase) => ({
      name: showcase.name,
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: `/portfolio/${showcase.slug}`,
      }),
    })),
  });

  return { showcases: data.items, collection };
}

export async function getPortfolioShowcaseMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  showcaseSlug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/portfolio/${input.showcaseSlug}`,
  });

  try {
    const data = await publicApi.getPortfolioShowcase(
      input.showcaseSlug,
      input.workspaceSlug ?? null
    );
    return {
      title: data.showcase.name,
      description: data.profile?.headline ?? "Portfolio showcase",
      alternates: { canonical },
      openGraph: {
        title: data.showcase.name,
        description: data.profile?.headline ?? "Portfolio showcase",
        url: canonical,
        type: "profile",
      },
    };
  } catch {
    return { title: "Showcase not found", alternates: { canonical } };
  }
}

export async function getPortfolioShowcasePageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  showcaseSlug: string;
}) {
  const { host, protocol } = input.ctx;
  const data = await publicApi
    .getPortfolioShowcase(input.showcaseSlug, input.workspaceSlug ?? null)
    .catch(() => null);
  if (!data) {
    notFound();
  }

  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/portfolio/${input.showcaseSlug}`,
  });

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
      name: "Portfolio",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/portfolio",
      }),
    },
    { name: data.showcase.name, url: canonical },
  ]);

  const schema = buildWebPageSchema({
    url: canonical,
    name: data.showcase.name,
    description: data.profile?.headline ?? "Portfolio showcase",
  });

  return {
    showcase: data.showcase,
    profile: data.profile,
    featuredProjects: data.featuredProjects,
    featuredClients: data.featuredClients,
    featuredServices: data.featuredServices,
    featuredTeamMembers: data.featuredTeamMembers,
    breadcrumb,
    schema,
  };
}

export async function getPortfolioProjectMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  showcaseSlug: string;
  projectSlug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/portfolio/${input.showcaseSlug}/projects/${input.projectSlug}`,
  });

  try {
    const data = await publicApi.getPortfolioProject(
      input.showcaseSlug,
      input.projectSlug,
      input.workspaceSlug ?? null
    );
    return {
      title: data.project.title,
      description: data.project.summary,
      alternates: { canonical },
      openGraph: {
        title: data.project.title,
        description: data.project.summary,
        url: canonical,
        type: "article",
      },
    };
  } catch {
    return { title: "Project not found", alternates: { canonical } };
  }
}

export async function getPortfolioProjectPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  showcaseSlug: string;
  projectSlug: string;
}) {
  const { host, protocol } = input.ctx;
  const data = await publicApi
    .getPortfolioProject(input.showcaseSlug, input.projectSlug, input.workspaceSlug ?? null)
    .catch(() => null);
  if (!data) {
    notFound();
  }

  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/portfolio/${input.showcaseSlug}/projects/${input.projectSlug}`,
  });

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
      name: "Portfolio",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/portfolio",
      }),
    },
    { name: data.project.title, url: canonical },
  ]);

  const schema = buildWebPageSchema({
    url: canonical,
    name: data.project.title,
    description: data.project.summary,
  });

  return { project: data.project, breadcrumb, schema };
}
