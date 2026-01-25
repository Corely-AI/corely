import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import {
  DEFAULT_PIPELINE_STAGES,
  type DealDto,
  type TimelineItem,
  type CreateActivityInput,
} from "@corely/contracts";
import { crmApi } from "@/lib/crm-api";
import { toast } from "sonner";

export const dealQueryKeys = {
  list: ["deals"] as const,
  detail: (id: string) => ["deal", id] as const,
  timeline: (id: string) => ["deal", id, "timeline"] as const,
};

export const useDeal = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? dealQueryKeys.detail(id) : ["deal", "missing"],
    queryFn: () => {
      if (!id) {
        throw new Error("Deal id is required");
      }
      return crmApi.getDeal(id);
    },
    enabled: !!id,
  });
};

export type TimelineFilter = "ALL" | "NOTE" | "TASK" | "CALL" | "MEETING" | "EMAIL_DRAFT" | "STAGE";

export const useDealTimeline = (id: string | undefined, filter: TimelineFilter = "ALL") => {
  return useQuery({
    queryKey: id
      ? [...dealQueryKeys.timeline(id), filter]
      : ["deal", "timeline", "missing", filter],
    queryFn: () => {
      if (!id) {
        throw new Error("Deal id is required for timeline");
      }
      return crmApi.getTimeline("deal", id);
    },
    enabled: !!id,
    select: (data: { items: TimelineItem[]; nextCursor?: string }) => {
      if (filter === "ALL") {
        return data;
      }
      if (filter === "STAGE") {
        return {
          ...data,
          items: data.items.filter((item) => item.type === "STAGE_TRANSITION"),
        };
      }
      return {
        ...data,
        items: data.items.filter(
          (item) => item.type === "ACTIVITY" && item.metadata?.activityType === filter
        ),
      };
    },
  });
};

const invalidateDeal = (queryClient: ReturnType<typeof useQueryClient>, dealId: string) => {
  void queryClient.invalidateQueries({ queryKey: dealQueryKeys.detail(dealId) });
  void queryClient.invalidateQueries({ queryKey: dealQueryKeys.timeline(dealId) });
  void queryClient.invalidateQueries({ queryKey: dealQueryKeys.list });
  void queryClient.invalidateQueries({ queryKey: ["activities"] });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, patch }: { dealId: string; patch: Partial<DealDto> }) =>
      crmApi.updateDeal(dealId, patch),
    onMutate: async ({ dealId, patch }) => {
      await queryClient.cancelQueries({ queryKey: dealQueryKeys.detail(dealId) });
      const previous = queryClient.getQueryData<DealDto>(dealQueryKeys.detail(dealId));
      if (previous) {
        queryClient.setQueryData<DealDto>(dealQueryKeys.detail(dealId), {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },
    onError: (_error, { dealId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dealQueryKeys.detail(dealId), context.previous);
      }
      toast.error("Failed to update deal");
    },
    onSuccess: (deal) => {
      queryClient.setQueryData(dealQueryKeys.detail(deal.id), deal);
      invalidateDeal(queryClient, deal.id);
      toast.success("Deal updated");
    },
  });
};

export const useChangeDealStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      crmApi.moveDealStage(dealId, stageId),
    onSuccess: (deal) => {
      queryClient.setQueryData(dealQueryKeys.detail(deal.id), deal);
      invalidateDeal(queryClient, deal.id);
      toast.success("Stage updated");
    },
    onError: () => toast.error("Failed to change stage"),
  });
};

export const useMarkDealWon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => crmApi.markDealWon(dealId),
    onSuccess: (deal) => {
      queryClient.setQueryData(dealQueryKeys.detail(deal.id), deal);
      invalidateDeal(queryClient, deal.id);
      toast.success("Deal marked won");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to mark deal as won");
    },
  });
};

export const useMarkDealLost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, reason }: { dealId: string; reason?: string }) =>
      crmApi.markDealLost(dealId, reason),
    onSuccess: (deal) => {
      queryClient.setQueryData(dealQueryKeys.detail(deal.id), deal);
      invalidateDeal(queryClient, deal.id);
      toast.success("Deal marked lost");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to mark deal as lost");
    },
  });
};

export const useAddDealActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealId,
      payload,
    }: {
      dealId: string;
      payload: Omit<CreateActivityInput, "dealId">;
    }) =>
      crmApi.createActivity({
        ...payload,
        dealId,
      }),
    onSuccess: (_activity, { dealId }) => {
      invalidateDeal(queryClient, dealId);
      toast.success("Activity added");
    },
    onError: () => toast.error("Failed to add activity"),
  });
};

export const usePipelineStages = () => {
  return useMemo(
    () =>
      DEFAULT_PIPELINE_STAGES.map((stage) => ({
        id: stage.id,
        name: stage.name,
        isClosed: stage.isClosedStage,
      })),
    []
  );
};
