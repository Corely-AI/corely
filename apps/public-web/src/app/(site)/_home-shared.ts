import type { Metadata } from "next";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/structured-data";
import { siteConfig } from "@/lib/site";
import { resolveCanonicalUrl } from "@/lib/urls";

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getHomeMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/",
  });

  return {
    title: "Corely Public",
    description: siteConfig.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: "Corely Public",
      description: siteConfig.description,
      url: canonical,
      type: "website",
      images: [siteConfig.defaultOgImage],
    },
  };
}

export async function getHomePageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}) {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/",
  });
  const baseUrl = new URL(canonical).origin;

  return {
    organizationSchema: buildOrganizationSchema(baseUrl),
    websiteSchema: buildWebsiteSchema(baseUrl),
  };
}
