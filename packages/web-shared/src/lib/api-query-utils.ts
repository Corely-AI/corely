/**
 * Utility to build URLSearchParams for list endpoints
 * Standardizes handling of arrays, filters object, and primitives.
 *
 * Rules:
 * - 'filters', 'dimensionFilters', 'customFieldFilters' keys are JSON stringified
 * - Arrays are appended as multiple keys (key=val1&key=val2)
 * - Primitives are converted to String()
 * - null/undefined values are ignored
 */
export function buildListQuery(params: object | undefined | null): URLSearchParams {
  const query = new URLSearchParams();
  if (!params) {
    return query;
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (
        (key === "filters" || key === "dimensionFilters" || key === "customFieldFilters") &&
        typeof value === "object"
      ) {
        query.append(key, JSON.stringify(value));
      } else if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, String(v)));
      } else {
        query.append(key, String(value));
      }
    }
  });

  return query;
}
