import { getPublicBookingMessages } from "@/components/pages/public-booking-messages";
import { getRequestContext } from "@/lib/request-context";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import { PublicBookingClient } from "@/components/pages/public-booking-client";
import { getPublicBookingMetadata, getPublicBookingPageData } from "@/app/(booking)/book/_shared";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  return getPublicBookingMetadata({ ctx, slug });
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    lang?: string;
    serviceId?: string;
    staffId?: string;
    day?: string;
    startAt?: string;
  }>;
}) {
  const ctx = await getRequestContext();
  const { slug } = await params;
  const initial = await searchParams;
  const result = await getPublicBookingPageData({ ctx, slug });

  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <PublicBookingClient
      {...getPublicBookingMessages(initial?.lang, ctx.acceptLanguage)}
      routeSlug={slug}
      page={result.page}
      services={result.services}
      staff={result.staff}
      basePath={result.basePath}
      initial={initial}
    />
  );
}
