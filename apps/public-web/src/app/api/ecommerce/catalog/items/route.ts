import { ListCatalogItemsInputSchema, ListCatalogItemsOutputSchema } from "@corely/contracts";
import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "../_server";

export async function GET(req: NextRequest) {
  const parsed = ListCatalogItemsInputSchema.parse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  return proxyCatalogGet({
    req,
    path: "/items",
    params: {
      q: parsed.q,
      page: parsed.page,
      pageSize: parsed.pageSize,
    },
    schema: ListCatalogItemsOutputSchema,
  });
}
