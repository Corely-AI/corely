"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../lib/catalog-api";
import { catalogQueryKeys, type CatalogCategoriesParams } from "../lib/query-keys";

export const useCatalogCategories = (params: CatalogCategoriesParams) =>
  useQuery({
    queryKey: catalogQueryKeys.categories(params),
    queryFn: () => catalogApi.listCategories(params),
  });
