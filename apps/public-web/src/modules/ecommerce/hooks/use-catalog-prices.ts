"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/catalog-api";
import { catalogQueryKeys, type CatalogPricesParams } from "../lib/query-keys";

export const useCatalogPrices = (params: CatalogPricesParams, enabled = true) =>
  useQuery({
    queryKey: catalogQueryKeys.prices(params),
    queryFn: () => catalogApi.listPrices(params),
    enabled,
  });
