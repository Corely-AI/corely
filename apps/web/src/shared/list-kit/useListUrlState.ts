import { useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { type FilterSpec, type ListQuery } from "@corely/contracts";

export interface ListUrlState {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  filters?: FilterSpec[]; // Structured filters
}

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const useListUrlState = (
  defaults: Partial<Omit<ListUrlState, "filters">> & {
    filters?: FilterSpec[];
  } = {},
  config?: { storageKey?: string }
) => {
  const [params, setParams] = useSearchParams();
  const { storageKey } = config ?? {};
  const isRestoring = useRef(false);

  // Parse state from URL
  const state = useMemo<ListUrlState>(() => {
    const page = parseNumber(params.get("page"), 1);
    const pageSize = parseNumber(params.get("pageSize"), defaults.pageSize ?? 50);
    const sort = params.get("sort") ?? defaults.sort;
    const q = params.get("q") ?? defaults.q;

    // Parse filters (JSON array of FilterSpec)
    const filtersParam = params.get("filters");
    let filters: FilterSpec[] | undefined = defaults.filters;
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (Array.isArray(parsed)) {
          filters = parsed;
        }
      } catch {
        // ignore
      }
    }

    return {
      q: q ?? undefined,
      page,
      pageSize,
      sort: sort ?? undefined,
      filters,
    };
  }, [params, defaults]);

  const setUrlState = useCallback(
    (next: Partial<ListUrlState>) => {
      setParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);

          if (next.q !== undefined) {
            if (next.q) {
              newParams.set("q", next.q);
            } else {
              newParams.delete("q");
            }
          }

          if (next.page !== undefined) {
            newParams.set("page", String(next.page));
          }

          if (next.pageSize !== undefined) {
            newParams.set("pageSize", String(next.pageSize));
          }

          if (next.sort !== undefined) {
            if (next.sort) {
              newParams.set("sort", next.sort);
            } else {
              newParams.delete("sort");
            }
          }

          if (next.filters !== undefined) {
            if (next.filters && next.filters.length > 0) {
              newParams.set("filters", JSON.stringify(next.filters));
            } else {
              newParams.delete("filters");
            }
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  // Persistence: Restore
  useEffect(() => {
    if (!storageKey) {
      return;
    }

    // If URL has state, don't restore (user likely clicked a specific link)
    // We check for presence of keys in current search params.
    // Note: 'page' and 'pageSize' might be defaults, but if they are in URL...
    // Actually simpler: if URL query string is empty (or near empty).
    const hasParams = Array.from(params.keys()).length > 0;

    if (!hasParams && !isRestoring.current) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const storedState = JSON.parse(stored);
          isRestoring.current = true;
          setUrlState(storedState);
        }
      } catch (e) {
        console.warn("Failed to restore list state", e);
      }
    }
  }, [storageKey, setUrlState]); // params removed to run only on mount/key change mostly

  // Persistence: Save
  useEffect(() => {
    if (!storageKey) {
      return;
    }
    // Don't save if we are in the middle of a restore (optional but safe)
    // Save current state
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey, state]);

  return [state, setUrlState] as const;
};
