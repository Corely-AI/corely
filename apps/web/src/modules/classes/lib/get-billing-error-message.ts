import { normalizeError } from "@corely/api-client";

export const getBillingErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null;
  }

  const apiError = normalizeError(error);
  if (apiError.validationErrors?.length) {
    return apiError.validationErrors[0].message;
  }

  return apiError.detail || apiError.message || null;
};
