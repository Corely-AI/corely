import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { taxCapabilitiesQueryKey } from "../queries";

export function useTaxCapabilitiesQuery(enabled = true) {
  return useQuery({
    queryKey: taxCapabilitiesQueryKey(),
    queryFn: () => taxApi.getCapabilities(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
