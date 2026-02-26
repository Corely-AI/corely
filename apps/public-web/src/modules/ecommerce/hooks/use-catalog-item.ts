"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/catalog-api";
import { catalogQueryKeys } from "../lib/query-keys";

type ScopeParams = {
  workspaceSlug?: string | null;
  workspaceId?: string | null;
};

export const useCatalogItem = (itemId: string, scope: ScopeParams) =>
  useQuery({
    queryKey: catalogQueryKeys.item(itemId),
    queryFn: () => catalogApi.getItem(itemId, scope),
    enabled: Boolean(itemId),
  });
