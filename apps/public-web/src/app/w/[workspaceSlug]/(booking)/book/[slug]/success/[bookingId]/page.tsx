import { PublicBookingConfirmation } from "@/components/pages/public-booking-confirmation";
import { getPublicBookingMessages } from "@/components/pages/public-booking-messages";
import { getRequestContext } from "@/lib/request-context";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import {
  getPublicBookingMetadata,
  getPublicBookingSummaryData,
} from "@/app/(booking)/book/_shared";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string; bookingId: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug, bookingId } = await params;
  return getPublicBookingMetadata({
    ctx,
    workspaceSlug,
    slug,
    pathSuffix: `/success/${bookingId}`,
  });
}

export default async function WorkspacePublicBookingSuccessPage({
  params,
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
  params: Promise<{ workspaceSlug: string; slug: string; bookingId: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug, bookingId } = await params;

  const result = await getPublicBookingSummaryData({
    ctx,
    workspaceSlug,
    slug,
    bookingId,
  });

  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }

  return (
    <PublicBookingConfirmation
      booking={result.booking}
      basePath={result.basePath}
      slug={slug}
      {...getPublicBookingMessages((await searchParams)?.lang, ctx.acceptLanguage)}
    />
  );
}
