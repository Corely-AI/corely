import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import type { TaxFilingItemsListQuery } from "@corely/contracts";
import { taxFilingItemsQueryKey } from "../queries";

export function useTaxFilingItemsQuery(id: string | undefined, query: TaxFilingItemsListQuery) {
  return useQuery({
    queryKey: taxFilingItemsQueryKey(id ?? "missing", query),
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing filing id"));
      }
      return taxApi.listFilingItems(id, query);
    },
    enabled: Boolean(id),
  });
}
