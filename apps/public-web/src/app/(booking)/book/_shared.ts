import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";
import { resolveCanonicalUrl, resolveWorkspacePath } from "@/lib/urls";
import { resolvePublicError } from "@/lib/public-errors";

export const BOOKING_REVALIDATE = 60;

type RequestContext = {
  host: string | null;
  protocol: string | null;
};

export async function getPublicBookingMetadata(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
  pathSuffix?: string;
}): Promise<Metadata> {
  const path = `/book/${input.slug}${input.pathSuffix ?? ""}`;
  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path,
  });

  try {
    const result = await publicApi.getPublicBookingPage(input.slug, input.workspaceSlug ?? null);

    return {
      title: `Book ${result.page.venueName}`,
      description: result.page.description ?? `Book services at ${result.page.venueName}`,
      alternates: { canonical },
      openGraph: {
        title: `Book ${result.page.venueName}`,
        description: result.page.description ?? `Book services at ${result.page.venueName}`,
        url: canonical,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Book appointment",
      alternates: { canonical },
    };
  }
}

export async function getPublicBookingPageData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
}) {
  const result = await publicApi
    .getPublicBookingPage(input.slug, input.workspaceSlug ?? null)
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

  const basePath = resolveWorkspacePath({
    host: input.ctx.host,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/book",
  });

  const canonical = resolveCanonicalUrl({
    host: input.ctx.host,
    protocol: input.ctx.protocol,
    workspaceSlug: input.workspaceSlug ?? null,
    path: `/book/${input.slug}`,
  });

  return {
    kind: "ok" as const,
    page: result.page,
    services: result.services,
    staff: result.staff,
    basePath,
    canonical,
  };
}

export async function getPublicBookingSummaryData(input: {
  ctx: RequestContext;
  workspaceSlug?: string | null;
  slug: string;
  bookingId: string;
}) {
  const result = await publicApi
    .getPublicBookingSummary(input.slug, input.bookingId, input.workspaceSlug ?? null)
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

  const basePath = resolveWorkspacePath({
    host: input.ctx.host,
    workspaceSlug: input.workspaceSlug ?? null,
    path: "/book",
  });

  return {
    kind: "ok" as const,
    booking: result.booking,
    basePath,
  };
}
