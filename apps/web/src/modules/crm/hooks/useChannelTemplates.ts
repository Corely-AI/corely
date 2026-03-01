import { useQuery } from "@tanstack/react-query";
import type { ListChannelTemplatesOutput } from "@corely/contracts";
import { crmApi } from "@/lib/crm-api";

export const channelTemplateQueryKeys = {
  all: ["channelTemplates"] as const,
  list: (params: { workspaceId: string; channel?: string; q?: string }) =>
    ["channelTemplates", "list", params] as const,
};

export const useChannelTemplates = (params: {
  workspaceId?: string | null;
  channel?: string;
  q?: string;
  enabled?: boolean;
}) => {
  return useQuery<ListChannelTemplatesOutput>({
    queryKey: params.workspaceId
      ? channelTemplateQueryKeys.list({
          workspaceId: params.workspaceId,
          channel: params.channel,
          q: params.q,
        })
      : [...channelTemplateQueryKeys.all, "missing-workspace"],
    queryFn: async () => {
      if (!params.workspaceId) {
        return { workspaceTemplates: [], systemTemplates: [], defaultTemplateId: null };
      }

      return crmApi.listChannelTemplates(params.workspaceId, {
        channel: params.channel,
        q: params.q,
      });
    },
    enabled: Boolean(params.workspaceId) && (params.enabled ?? true),
  });
};
