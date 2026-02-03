import { RentalDetailClient } from "@/components/pages/rental-detail-client";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import {
  RENTALS_REVALIDATE,
  getRentalDetailMetadata,
  getRentalDetailPageData,
} from "@/app/(rentals)/rentals/_shared";
import { buildFaqSchema } from "@/lib/structured-data";

export const revalidate = RENTALS_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  return getRentalDetailMetadata({
    ctx,
    workspaceSlug,
    slug,
  });
}

export default async function WorkspaceRentalDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; slug: string }>;
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug, slug } = await params;
  const result = await getRentalDetailPageData({
    ctx,
    workspaceSlug,
    slug,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }
  const { property, summary, bullets, faqs, basePath, breadcrumb, schema } = result;

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={schema} />
      <JsonLd data={buildFaqSchema(faqs)} />
      <RentalDetailClient
        property={property}
        basePath={basePath}
        summary={summary}
        bullets={bullets}
        faqs={faqs}
        workspaceSlug={workspaceSlug}
      />
    </>
  );
}
