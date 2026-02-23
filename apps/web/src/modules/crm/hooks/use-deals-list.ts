import { useQuery } from "@tanstack/react-query";
import { crmApi } from "@/lib/crm-api";
import type { DealDto } from "@corely/contracts";

export type DealsListParams = {
  partyId?: string;
  stageId?: string;
  status?: string;
  ownerUserId?: string;
  pageSize?: number;
};

export const dealsListQueryKey = (params?: DealsListParams) =>
  ["deals", "list", params ?? {}] as const;

export function useDealsList(params?: DealsListParams) {
  return useQuery<{ deals: DealDto[]; nextCursor?: string }>({
    queryKey: dealsListQueryKey(params),
    queryFn: () =>
      crmApi.listDeals({
        partyId: params?.partyId,
        stageId: params?.stageId,
        status: params?.status,
        ownerUserId: params?.ownerUserId,
        pageSize: params?.pageSize ?? 100,
      }),
  });
}
