import { RentalsListContent } from "@/components/pages/rentals-list-page";
import { getRequestContext } from "@/lib/request-context";
import { JsonLd } from "@/components/seo/json-ld";
import { PublicDisabledState } from "@/components/sections/public-disabled";
import {
  RENTALS_REVALIDATE,
  getRentalsListMetadata,
  getRentalsListPageData,
} from "@/app/(rentals)/rentals/_shared";

export const revalidate = RENTALS_REVALIDATE;

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  return getRentalsListMetadata({ ctx, workspaceSlug });
}

export default async function WorkspaceRentalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: { q?: string; category?: string };
}) {
  const ctx = await getRequestContext();
  const { workspaceSlug } = await params;
  const result = await getRentalsListPageData({
    ctx,
    workspaceSlug,
    searchParams,
  });
  if (result.kind === "disabled") {
    return <PublicDisabledState message={result.message} />;
  }
  const { properties, categories, query, categorySlug, basePath, collection } = result;

  return (
    <>
      <JsonLd data={collection} />
      <RentalsListContent
        properties={properties}
        categories={categories}
        basePath={basePath}
        query={query}
        categorySlug={categorySlug}
      />
    </>
  );
}
