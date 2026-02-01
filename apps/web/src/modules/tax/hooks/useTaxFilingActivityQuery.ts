import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { taxFilingActivityQueryKey } from "../queries";

export function useTaxFilingActivityQuery(id: string | undefined) {
  return useQuery({
    queryKey: taxFilingActivityQueryKey(id ?? "missing"),
    queryFn: () => {
      if (!id) {
        return Promise.reject(new Error("Missing filing id"));
      }
      return taxApi.listFilingActivity(id);
    },
    enabled: Boolean(id),
  });
}
