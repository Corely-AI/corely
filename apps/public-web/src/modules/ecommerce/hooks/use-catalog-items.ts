"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/catalog-api";
import { catalogQueryKeys, type CatalogItemsParams } from "../lib/query-keys";

export const useCatalogItems = (params: CatalogItemsParams) =>
  useQuery({
    queryKey: catalogQueryKeys.items(params),
    queryFn: () => catalogApi.listItems(params),
  });
