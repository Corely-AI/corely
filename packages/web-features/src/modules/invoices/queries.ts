/**
 * Invoice Query Keys
 *
 * Workspace-scoped query keys for invoice-related React Query operations.
 * These ensure proper cache isolation between workspaces.
 */
import { workspaceQueryKeys } from "@corely/web-shared/shared/workspaces/workspace-query-keys";

export const invoiceQueryKeys = workspaceQueryKeys.invoices;
