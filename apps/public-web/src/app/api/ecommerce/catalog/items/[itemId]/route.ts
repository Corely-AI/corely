import { GetCatalogItemInputSchema, GetCatalogItemOutputSchema } from "@corely/contracts";
import type { NextRequest } from "next/server";
import { proxyCatalogGet } from "../../_server";

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{ itemId: string }>;
  }
) {
  const { itemId } = await context.params;
  const parsed = GetCatalogItemInputSchema.parse({ itemId });

  return proxyCatalogGet({
    req,
    path: `/items/${parsed.itemId}`,
    schema: GetCatalogItemOutputSchema,
  });
}
