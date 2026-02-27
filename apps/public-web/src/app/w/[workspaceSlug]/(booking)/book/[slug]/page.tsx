import { getRequestContext } from "@/lib/request-context";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { PublicBookingClient } from "@/components/pages/public-booking-client";
import {
  BOOKING_REVALIDATE,
  getPublicBookingMetadata,
  getPublicBookingPageData,
} from "@/app/(booking)/book/_shared";

export const revalidate = BOOKING_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  return getPublicBookingMetadata({ ctx, workspaceSlug, slug });
}

export default async function WorkspacePublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
  searchParams?: Promise<{
    serviceId?: string;
    staffId?: string;
    day?: string;
    startAt?: string;
  }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  const initial = await searchParams;

  const result = await getPublicBookingPageData({ ctx, workspaceSlug, slug });

  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <PublicBookingClient
      routeSlug={slug}
      page={result.page}
      services={result.services}
      staff={result.staff}
      basePath={result.basePath}
      workspaceSlug={workspaceSlug}
      initial={initial}
    />
  );
}
