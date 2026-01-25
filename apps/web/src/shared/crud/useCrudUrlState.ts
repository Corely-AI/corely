import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type CrudUrlState = {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  filters?: Record<string, unknown>;
};

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const useCrudUrlState = (
  defaults: Partial<Omit<CrudUrlState, "page" | "pageSize">> & { pageSize?: number } = {}
): [CrudUrlState, (next: Partial<CrudUrlState>) => void] => {
  const [params, setParams] = useSearchParams();

  const state = useMemo<CrudUrlState>(() => {
    const page = parseNumber(params.get("page"), 1);
    const pageSize = parseNumber(params.get("pageSize"), defaults.pageSize ?? 20);
    const sort = params.get("sort") ?? defaults.sort;
    const q = params.get("q") ?? defaults.q;
    const filtersParam = params.get("filters");
    let filters: Record<string, unknown> | undefined = defaults.filters;
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (parsed && typeof parsed === "object") {
          filters = parsed as Record<string, unknown>;
        }
      } catch {
        // ignore malformed filters
      }
    }
    return { q: q ?? undefined, page, pageSize, sort: sort ?? undefined, filters };
  }, [params, defaults.pageSize, defaults.sort, defaults.q, defaults.filters]);

  const update = (next: Partial<CrudUrlState>) => {
    const nextParams = new URLSearchParams(params.toString());
    if (next.q !== undefined) {
      if (next.q) {
        nextParams.set("q", next.q);
      } else {
        nextParams.delete("q");
      }
    }
    if (next.page !== undefined) {
      nextParams.set("page", String(next.page));
    }
    if (next.pageSize !== undefined) {
      nextParams.set("pageSize", String(next.pageSize));
    }
    if (next.sort !== undefined) {
      if (next.sort) {
        nextParams.set("sort", next.sort);
      } else {
        nextParams.delete("sort");
      }
    }
    if (next.filters !== undefined) {
      if (next.filters) {
        nextParams.set("filters", JSON.stringify(next.filters));
      } else {
        nextParams.delete("filters");
      }
    }
    setParams(nextParams, { replace: true });
  };

  return [state, update];
};
