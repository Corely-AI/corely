import { z } from "zod";

// Filter operators
export const FilterOperatorSchema = z.enum([
  "eq",
  "in",
  "contains",
  "startsWith",
  "gte",
  "lte",
  "between",
  "isNull",
  "isNotNull",
]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

// Filter Spec
export const FilterSpecSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.unknown(), // Value depends on operator, validated at runtime/backend
});
export type FilterSpec = z.infer<typeof FilterSpecSchema>;

// Shared List Query
export const ListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(50),
  sort: z.union([z.string(), z.array(z.string())]).optional(), // "field:asc" or ["field:asc", "other:desc"]
  filters: z
    .union([z.string(), z.array(FilterSpecSchema)])
    .optional()
    .transform((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return val;
    }),
});
export type ListQuery = z.infer<typeof ListQuerySchema>;

// Page Info
export const PageInfoSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  hasNextPage: z.boolean(),
});
export type PageInfo = z.infer<typeof PageInfoSchema>;

// Generic List Response Helper
export const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pageInfo: PageInfoSchema,
  });
