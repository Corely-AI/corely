import { RentalDetailClient } from "@/components/pages/rental-detail-client";
import { JsonLd } from "@/components/seo/json-ld";
import { getRequestContext } from "@/lib/request-context";
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
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  return getRentalDetailMetadata({
    ctx,
    workspaceSlug: params.workspaceSlug,
    slug: params.slug,
  });
}

export default async function WorkspaceRentalDetailPage({
  params,
}: {
  params: { workspaceSlug: string; slug: string };
}) {
  const ctx = getRequestContext();
  const { property, summary, bullets, faqs, basePath, breadcrumb, schema } =
    await getRentalDetailPageData({
      ctx,
      workspaceSlug: params.workspaceSlug,
      slug: params.slug,
    });

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
        workspaceSlug={params.workspaceSlug}
      />
    </>
  );
}
