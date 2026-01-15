import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const createCrudQueryKeys = (resource: string) => {
  const base = [resource] as const;
  return {
    all: base as QueryKey,
    list: (params?: unknown) => [resource, "list", params ?? {}] as QueryKey,
    detail: (id: string | undefined) => [resource, id] as QueryKey,
    options: () => [resource, "options"] as QueryKey,
  };
};

export const invalidateResourceQueries = async (
  queryClient: QueryClient,
  resource: string,
  opts?: { id?: string }
) => {
  const keys = createCrudQueryKeys(resource);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.list() }),
    opts?.id
      ? queryClient.invalidateQueries({ queryKey: keys.detail(opts.id) })
      : Promise.resolve(),
  ]);
};
