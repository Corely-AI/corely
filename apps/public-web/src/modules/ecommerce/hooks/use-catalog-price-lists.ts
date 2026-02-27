"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/catalog-api";
import { catalogQueryKeys, type CatalogPriceListsParams } from "../lib/query-keys";

export const useCatalogPriceLists = (params: CatalogPriceListsParams) =>
  useQuery({
    queryKey: catalogQueryKeys.priceLists(params),
    queryFn: () => catalogApi.listPriceLists(params),
  });
