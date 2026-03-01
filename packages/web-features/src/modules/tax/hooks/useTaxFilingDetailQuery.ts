import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { taxFilingQueryKeys } from "../queries";

export function useTaxFilingDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: taxFilingQueryKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing filing id"));
      }
      return taxApi.getFilingDetail(id);
    },
    enabled: Boolean(id),
  });
}
