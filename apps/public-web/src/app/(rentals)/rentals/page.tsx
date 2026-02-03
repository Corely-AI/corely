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

export async function generateMetadata() {
  const ctx = await getRequestContext();
  return getRentalsListMetadata({ ctx });
}

export default async function RentalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const ctx = await getRequestContext();
  const resolvedSearchParams = await searchParams;
  const result = await getRentalsListPageData({ ctx, searchParams: resolvedSearchParams });
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
