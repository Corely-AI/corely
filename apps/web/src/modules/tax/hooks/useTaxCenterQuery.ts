import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { type GetTaxCenterInput } from "@corely/contracts";

export function useTaxCenterQuery(input: GetTaxCenterInput, enabled = true) {
  return useQuery({
    queryKey: ["tax", "center", input],
    queryFn: () => taxApi.getCenter(input),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
