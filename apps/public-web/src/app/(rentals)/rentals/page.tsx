import { RentalsListContent } from "@/components/pages/rentals-list-page";
import { getRequestContext } from "@/lib/request-context";
import { JsonLd } from "@/components/seo/json-ld";
import {
  RENTALS_REVALIDATE,
  getRentalsListMetadata,
  getRentalsListPageData,
} from "@/app/(rentals)/rentals/_shared";

export const revalidate = RENTALS_REVALIDATE;

export async function generateMetadata() {
  const ctx = getRequestContext();
  return getRentalsListMetadata({ ctx });
}

export default async function RentalsPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string };
}) {
  const ctx = getRequestContext();
  const { properties, categories, query, categorySlug, basePath, collection } =
    await getRentalsListPageData({ ctx, searchParams });

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
