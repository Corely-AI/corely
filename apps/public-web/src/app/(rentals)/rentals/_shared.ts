import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi, buildPublicFileUrl } from "@/lib/public-api";
import { resolveCanonicalUrl, resolveWorkspacePath } from "@/lib/urls";
import {
  buildCollectionSchema,
  buildBreadcrumbList,
  buildRentalSchema,
} from "@/lib/structured-data";
import { buildBulletList, buildSummary } from "@/lib/summary";
import { resolvePublicError } from "@/lib/public-errors";

export const RENTALS_REVALIDATE = 300;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getRentalsListMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/rentals",
  });

  return {
    title: "Rentals",
    description: "Find your next stay.",
    alternates: {
      canonical,
    },
    openGraph: {
      title: "Rentals",
      description: "Find your next stay.",
      url: canonical,
      type: "website",
    },
  };
}

export async function getRentalsListPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  searchParams?: { q?: string; category?: string };
}) {
  const { host, protocol } = input.ctx;
  const query = input.searchParams?.q ?? "";
  const categorySlug = input.searchParams?.category;

  const [propertiesResult, categoriesResult] = await Promise.all([
    publicApi
      .listRentals({
        q: query || undefined,
        categorySlug,
        workspaceSlug: input.workspaceSlug ?? null,
      })
      .catch((error) => ({ error })),
    publicApi.listRentalCategories(input.workspaceSlug ?? null).catch((error) => ({ error })),
  ]);

  if ("error" in propertiesResult) {
    const resolved = resolvePublicError(propertiesResult.error);
    if (resolved?.kind === "disabled") {
      return { kind: "disabled", message: resolved.message } as const;
    }
    throw propertiesResult.error;
  }

  if ("error" in categoriesResult) {
    const resolved = resolvePublicError(categoriesResult.error);
    if (resolved?.kind === "disabled") {
      return { kind: "disabled", message: resolved.message } as const;
    }
    throw categoriesResult.error;
  }

  const properties = propertiesResult;
  const categories = categoriesResult;

  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/rentals",
  });

  const basePath = resolveWorkspacePath({
    host,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/rentals",
  });

  const collection = buildCollectionSchema({
    url: canonical,
    name: "Rentals",
    description: "Find your next stay.",
    items: properties.map((property) => ({
      name: property.name,
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: `/rentals/${property.slug}`,
      }),
    })),
  });

  return {
    kind: "ok" as const,
    properties,
    categories,
    query,
    categorySlug,
    basePath,
    collection,
  };
}

export async function getRentalDetailMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}): Promise<Metadata> {
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/rentals/${input.slug}`,
  });

  try {
    const property = await publicApi.getRentalProperty(input.slug, input.workspaceSlug ?? null);
    const ogImage = property.coverImageFileId
      ? buildPublicFileUrl(property.coverImageFileId)
      : undefined;

    return {
      title: property.name,
      description: property.summary ?? "Rental property.",
      alternates: { canonical },
      openGraph: {
        title: property.name,
        description: property.summary ?? "Rental property.",
        url: canonical,
        type: "article",
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return {
      title: "Property not found",
      alternates: { canonical },
    };
  }
}

export async function getRentalDetailPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}) {
  const { host, protocol } = input.ctx;
  const propertyResult = await publicApi
    .getRentalProperty(input.slug, input.workspaceSlug ?? null)
    .catch((error) => ({ error }));

  if ("error" in propertyResult) {
    const resolved = resolvePublicError(propertyResult.error);
    if (resolved?.kind === "disabled") {
      return { kind: "disabled", message: resolved.message } as const;
    }
    if (resolved?.kind === "not-found") {
      notFound();
    }
    throw propertyResult.error;
  }

  const property = propertyResult;

  const canonical = resolveCanonicalUrl({
    host,
    protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/rentals/${input.slug}`,
  });
  const basePath = resolveWorkspacePath({
    host,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/rentals",
  });

  const summary = buildSummary({
    excerpt: property.summary,
    contentText: property.summary ?? undefined,
    fallback: "A curated rental stay available for booking.",
    maxSentences: 2,
  });
  const bullets = buildBulletList([
    property.maxGuests ? `Sleeps up to ${property.maxGuests} guests` : null,
    property.price && property.currency
      ? `From ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: property.currency,
          maximumFractionDigits: 0,
        }).format(property.price)} per night`
      : null,
    property.categories?.length
      ? `Categories: ${property.categories.map((c) => c.name).join(", ")}`
      : null,
  ]);
  const faqs = [
    {
      question: "How do I request a booking?",
      answer: "Choose your dates and submit a booking request to the host via Corely.",
    },
    {
      question: "Is my payment captured immediately?",
      answer: "No. You can request a booking without being charged right away.",
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
      name: "Rentals",
      url: resolveCanonicalUrl({
        host,
        protocol,
        workspaceSlug: input.workspaceSlug ?? null,
        path: "/rentals",
      }),
    },
    { name: property.name, url: canonical },
  ]);

  const schema = buildRentalSchema({
    name: property.name,
    description: property.summary ?? "Rental property.",
    url: canonical,
    imageUrl: property.coverImageFileId ? buildPublicFileUrl(property.coverImageFileId) : null,
    price: property.price ?? null,
    currency: property.currency ?? null,
  });

  return {
    kind: "ok" as const,
    property,
    summary,
    bullets,
    faqs,
    basePath,
    breadcrumb,
    schema,
    canonical,
  };
}
