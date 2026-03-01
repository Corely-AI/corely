import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import type { GetVatPeriodsInput } from "@corely/contracts";

export function useVatPeriodsQuery(input: GetVatPeriodsInput, enabled = true) {
  return useQuery({
    queryKey: ["tax", "vat-periods", input],
    queryFn: () => taxApi.getVatFilingPeriods(input),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
