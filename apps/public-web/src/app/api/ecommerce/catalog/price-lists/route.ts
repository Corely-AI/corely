import {
  ListCatalogPriceListsInputSchema,
  ListCatalogPriceListsOutputSchema,
} from "@corely/contracts";
import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "../_server";

export async function GET(req: NextRequest) {
  const parsed = ListCatalogPriceListsInputSchema.parse({
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  return proxyCatalogGet({
    req,
    path: "/price-lists",
    params: {
      page: parsed.page,
      pageSize: parsed.pageSize,
    },
    schema: ListCatalogPriceListsOutputSchema,
  });
}
