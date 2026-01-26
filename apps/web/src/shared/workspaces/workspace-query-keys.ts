/**
 * Workspace-Scoped Query Keys
 *
 * This module provides utility functions for creating workspace-scoped
 * React Query keys. All data queries should use these to ensure proper
 * cache isolation between workspaces.
 */

import type { QueryKey } from "@tanstack/react-query";
import { getActiveWorkspaceId } from "./workspace-store";

/**
 * Prefixes a query key with the current workspace ID.
 * This ensures cache isolation between workspaces.
 *
 * @example
 * // Returns ["ws_abc123", "invoices", "list"]
 * withWorkspace(["invoices", "list"])
 */
export function withWorkspace(key: QueryKey, workspaceId?: string | null): QueryKey {
  const wsId = workspaceId ?? getActiveWorkspaceId();
  if (!wsId) {
    console.warn("[QueryKeys] No workspaceId available, using unscoped key");
    return key;
  }
  return [`ws_${wsId}`, ...key];
}

/**
 * Creates a workspace-scoped query key factory for a resource.
 *
 * @example
 * const invoiceKeys = createWorkspaceQueryKeys("invoices");
 *
 * // List all invoices in current workspace
 * queryKey: invoiceKeys.list()
 *
 * // Get specific invoice
 * queryKey: invoiceKeys.detail("inv_123")
 */
export function createWorkspaceQueryKeys(resource: string) {
  return {
    /**
     * Root key for all queries of this resource in the current workspace
     */
    all: (workspaceId?: string | null) => withWorkspace([resource], workspaceId),

    /**
     * Key for list queries with optional filters
     */
    list: (filters?: unknown, workspaceId?: string | null) =>
      withWorkspace([resource, "list", filters ?? {}], workspaceId),

    /**
     * Key for a specific item detail
     */
    detail: (id: string, workspaceId?: string | null) =>
      withWorkspace([resource, "detail", id], workspaceId),

    /**
     * Key for select/dropdown options
     */
    options: (workspaceId?: string | null) => withWorkspace([resource, "options"], workspaceId),

    /**
     * Key for resource counts/stats
     */
    stats: (filters?: unknown, workspaceId?: string | null) =>
      withWorkspace([resource, "stats", filters ?? {}], workspaceId),
  };
}

/**
 * Pre-defined query keys for common resources.
 * Import and use these instead of creating inline query keys.
 */
export const workspaceQueryKeys = {
  // Core business entities
  invoices: createWorkspaceQueryKeys("invoices"),
  customers: createWorkspaceQueryKeys("customers"),
  expenses: createWorkspaceQueryKeys("expenses"),
  receipts: createWorkspaceQueryKeys("receipts"),

  // CRM
  deals: createWorkspaceQueryKeys("deals"),
  contacts: createWorkspaceQueryKeys("contacts"),
  leads: createWorkspaceQueryKeys("leads"),
  channels: createWorkspaceQueryKeys("channels"),

  // Inventory
  products: createWorkspaceQueryKeys("products"),
  warehouses: createWorkspaceQueryKeys("warehouses"),
  inventory: createWorkspaceQueryKeys("inventory"),

  // Financial
  accounting: createWorkspaceQueryKeys("accounting"),
  tax: createWorkspaceQueryKeys("tax"),
  payments: createWorkspaceQueryKeys("payments"),

  // Platform
  templates: createWorkspaceQueryKeys("templates"),
  settings: createWorkspaceQueryKeys("settings"),
};
