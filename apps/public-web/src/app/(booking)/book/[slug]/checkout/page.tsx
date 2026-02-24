import { notFound } from "next/navigation";
import { getRequestContext } from "@/lib/request-context";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { PublicBookingCheckoutClient } from "@/components/pages/public-booking-checkout-client";
import {
  BOOKING_REVALIDATE,
  getPublicBookingMetadata,
  getPublicBookingPageData,
} from "@/app/(booking)/book/_shared";

export const revalidate = BOOKING_REVALIDATE;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  return getPublicBookingMetadata({ ctx, slug, pathSuffix: "/checkout" });
}

export default async function PublicBookingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    serviceId?: string;
    staffId?: string;
    startAt?: string;
    endAt?: string;
    resourceId?: string;
  }>;
}) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  const query = await searchParams;

  if (!query?.serviceId || !query?.startAt || !query?.endAt || !query?.resourceId) {
    notFound();
  }

  const result = await getPublicBookingPageData({ ctx, slug });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  const service = result.services.find((item) => item.id === query.serviceId);
  if (!service) {
    notFound();
  }

  const staff = query.staffId
    ? (result.staff.find((item) => item.id === query.staffId) ?? null)
    : null;

  return (
    <PublicBookingCheckoutClient
      routeSlug={slug}
      page={result.page}
      service={service}
      staff={staff}
      basePath={result.basePath}
      startAt={query.startAt}
      endAt={query.endAt}
      resourceId={query.resourceId}
    />
  );
}
