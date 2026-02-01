import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { TaxPaymentsListQuery } from "@corely/contracts";
import { taxApi } from "@/lib/tax-api";
import { taxPaymentsQueryKeys } from "../queries";

export function useTaxPaymentsQuery(input: TaxPaymentsListQuery, enabled = true) {
  return useQuery({
    queryKey: taxPaymentsQueryKeys.list(input),
    queryFn: () => taxApi.listPayments(input),
    enabled,
    placeholderData: keepPreviousData,
  });
}
