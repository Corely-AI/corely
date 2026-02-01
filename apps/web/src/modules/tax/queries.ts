import { createWorkspaceQueryKeys, withWorkspace } from "@/shared/workspaces/workspace-query-keys";
import type { QueryKey } from "@tanstack/react-query";

export const taxFilingQueryKeys = createWorkspaceQueryKeys("tax-filings");
export const taxPaymentsQueryKeys = createWorkspaceQueryKeys("tax-payments");

export const taxCapabilitiesQueryKey = (workspaceId?: string | null): QueryKey =>
  withWorkspace(["tax", "capabilities"], workspaceId);

export const taxFilingItemsQueryKey = (
  filingId: string,
  params?: unknown,
  workspaceId?: string | null
): QueryKey => withWorkspace(["tax-filings", filingId, "items", params ?? {}], workspaceId);

export const taxFilingAttachmentsQueryKey = (
  filingId: string,
  workspaceId?: string | null
): QueryKey => withWorkspace(["tax-filings", filingId, "attachments"], workspaceId);

export const taxFilingActivityQueryKey = (
  filingId: string,
  workspaceId?: string | null
): QueryKey => withWorkspace(["tax-filings", filingId, "activity"], workspaceId);
