import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import type { DealDto } from "@corely/contracts";
import { dealsListQueryKey, type DealsListParams } from "./use-deals-list";
import { dealQueryKeys } from "./useDeal";

type UpdateDealStageVars = {
  dealId: string;
  newStageId: string;
  /** Pass the same params used in useDealsList so we can optimistically update the cache. */
  listParams?: DealsListParams;
};

type MutationContext = {
  previousList: { deals: DealDto[]; nextCursor?: string } | undefined;
};

export function useUpdateDealStage() {
  const queryClient = useQueryClient();

  return useMutation<DealDto, Error, UpdateDealStageVars, MutationContext>({
    mutationFn: ({ dealId, newStageId }) => crmApi.moveDealStage(dealId, newStageId),

    onMutate: async ({ dealId, newStageId, listParams }) => {
      const listKey = dealsListQueryKey(listParams);

      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: listKey });

      // Snapshot previous value
      const previousList = queryClient.getQueryData<{
        deals: DealDto[];
        nextCursor?: string;
      }>(listKey);

      // Optimistically update the list cache
      if (previousList) {
        queryClient.setQueryData<{ deals: DealDto[]; nextCursor?: string }>(listKey, {
          ...previousList,
          deals: previousList.deals.map((d) =>
            d.id === dealId ? { ...d, stageId: newStageId } : d
          ),
        });
      }

      return { previousList };
    },

    onError: (_error, { dealId, listParams }, context) => {
      // Roll back optimistic update
      const listKey = dealsListQueryKey(listParams);
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      toast.error("Failed to move deal. Changes reverted.");
      void queryClient.invalidateQueries({ queryKey: dealQueryKeys.detail(dealId) });
    },

    onSettled: (_data, _error, { dealId, listParams }) => {
      const listKey = dealsListQueryKey(listParams);
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: dealQueryKeys.detail(dealId) });
    },
  });
}
