import type { ParsedUrlQueryInput } from "querystring";

export type ParsedListQuery = {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  filters?: Record<string, unknown>;
  includeArchived?: boolean;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

const toNumber = (value: unknown): number | undefined => {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(num) ? num : undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === false) {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
};

export const parseListQuery = (
  raw: ParsedUrlQueryInput | Record<string, unknown> | undefined,
  options?: { defaultPageSize?: number; maxPageSize?: number }
): ParsedListQuery => {
  const page = Math.max(toNumber(raw?.page) ?? 1, 1);
  const defaultPageSize = options?.defaultPageSize ?? 20;
  const maxPageSize = options?.maxPageSize ?? 100;
  const pageSize = Math.min(Math.max(toNumber(raw?.pageSize) ?? defaultPageSize, 1), maxPageSize);
  const sort = typeof raw?.sort === "string" ? raw.sort : undefined;
  const q = typeof raw?.q === "string" ? raw.q : undefined;
  const includeArchived = toBoolean((raw as any)?.includeArchived);

  let filters: Record<string, unknown> | undefined;
  if (typeof raw?.filters === "string") {
    try {
      const parsed = JSON.parse(raw.filters);
      if (parsed && typeof parsed === "object") {
        filters = parsed as Record<string, unknown>;
      }
    } catch {
      // ignore malformed filters
    }
  }

  return { q, page, pageSize, sort, filters, includeArchived };
};

export const buildPageInfo = (total: number, page: number, pageSize: number): PageInfo => {
  const safePage = Math.max(page, 1);
  const safePageSize = Math.max(pageSize, 1);
  const hasNextPage = safePage * safePageSize < total;
  return {
    page: safePage,
    pageSize: safePageSize,
    total,
    hasNextPage,
  };
};
