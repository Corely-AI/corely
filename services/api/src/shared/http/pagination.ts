import type { ParsedUrlQueryInput } from "querystring";
import { ListQuerySchema, type ListQuery, type PageInfo } from "@corely/contracts";

export type ParsedListQuery = ListQuery & {
  includeArchived?: boolean;
};

export { type PageInfo };

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
  const defaultPageSize = options?.defaultPageSize ?? 50;
  const maxPageSize = options?.maxPageSize ?? 1000;
  const pageSize = Math.min(Math.max(toNumber(raw?.pageSize) ?? defaultPageSize, 1), maxPageSize);
  const sort = typeof raw?.sort === "string" ? raw.sort : undefined;
  const q = typeof raw?.q === "string" ? raw.q : undefined;
  const includeArchived = toBoolean((raw as any)?.includeArchived);

  // Parse filters using the schema transformation logic if possible, or fallback manually
  let filters: any = undefined;
  if (typeof raw?.filters === "string") {
    try {
      filters = JSON.parse(raw.filters);
    } catch {
      filters = [];
    }
  } else if (Array.isArray(raw?.filters)) {
    filters = raw?.filters;
  }

  // Validate via Zod to ensure standard compliance
  const standardQuery = ListQuerySchema.safeParse({
    q,
    page,
    pageSize,
    sort,
    filters,
  });

  if (!standardQuery.success) {
    // Fallback if something is very wrong, though coercions above handle most cases
    return {
      q,
      page,
      pageSize,
      sort,
      filters: undefined,
      includeArchived,
    };
  }

  return {
    ...standardQuery.data,
    includeArchived,
  };
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
