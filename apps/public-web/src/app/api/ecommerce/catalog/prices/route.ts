import { ListCatalogPricesInputSchema, ListCatalogPricesOutputSchema } from "@corely/contracts";
import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "../_server";

export async function GET(req: NextRequest) {
  const parsed = ListCatalogPricesInputSchema.parse({
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
    priceListId: req.nextUrl.searchParams.get("priceListId") ?? undefined,
    itemId: req.nextUrl.searchParams.get("itemId") ?? undefined,
    variantId: req.nextUrl.searchParams.get("variantId") ?? undefined,
  });

  return proxyCatalogGet({
    req,
    path: "/prices",
    params: {
      page: parsed.page,
      pageSize: parsed.pageSize,
      priceListId: parsed.priceListId,
      itemId: parsed.itemId,
      variantId: parsed.variantId,
    },
    schema: ListCatalogPricesOutputSchema,
  });
}
