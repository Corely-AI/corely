/**
 * Expense Capabilities Contract
 *
 * Defines the shape of capabilities that the Expense domain exposes to UI clients.
 * This enables UI to render status, badges, transitions, and actions without
 * embedding business logic - all rules come from the domain.
 */

import { z } from "zod";
import { ExpenseStatusSchema } from "./expense.types";

// -----------------------------------------------------------------------------
// Status Capability
// -----------------------------------------------------------------------------

export const ExpenseStatusToneSchema = z.enum([
  "muted", // Draft, inactive states
  "default", // Normal/submitted states
  "accent", // Active/approved states
  "success", // Completed/paid states
  "destructive", // Rejected states
]);
export type ExpenseStatusTone = z.infer<typeof ExpenseStatusToneSchema>;

export const ExpenseStatusCapabilitySchema = z.object({
  value: ExpenseStatusSchema,
  label: z.string(),
  tone: ExpenseStatusToneSchema,
});
export type ExpenseStatusCapability = z.infer<typeof ExpenseStatusCapabilitySchema>;

// -----------------------------------------------------------------------------
// Derived Badges
// -----------------------------------------------------------------------------

export const ExpenseBadgeKeySchema = z.enum([
  "RECEIPT_MISSING", // No receipts attached
  "HIGH_VALUE", // Amount > Threshold (e.g. 1000)
]);
export type ExpenseBadgeKey = z.infer<typeof ExpenseBadgeKeySchema>;

export const ExpenseBadgeToneSchema = z.enum([
  "warning", // Missing receipt
  "info", // High value
  "success",
  "muted",
]);
export type ExpenseBadgeTone = z.infer<typeof ExpenseBadgeToneSchema>;

export const ExpenseBadgeSchema = z.object({
  key: ExpenseBadgeKeySchema,
  label: z.string(),
  tone: ExpenseBadgeToneSchema,
});
export type ExpenseBadge = z.infer<typeof ExpenseBadgeSchema>;

// -----------------------------------------------------------------------------
// Status Transitions
// -----------------------------------------------------------------------------

export const ExpenseTransitionSchema = z.object({
  /** Target status after transition */
  to: ExpenseStatusSchema,

  /** User-facing label for the transition (e.g., "Submit for Approval") */
  label: z.string(),

  /** Whether the transition can be invoked in current state */
  enabled: z.boolean(),

  /** If disabled, explains why (user-facing) */
  reason: z.string().optional(),

  /** If true, requires confirmation dialog before executing */
  dangerous: z.boolean(),

  /** Title for confirmation dialog (if dangerous) */
  confirmTitle: z.string().optional(),

  /** Body message for confirmation dialog (if dangerous) */
  confirmMessage: z.string().optional(),

  /** If set, the confirmation dialog requires this input field (e.g., "reason") */
  requiresInput: z.string().optional(),
});
export type ExpenseTransition = z.infer<typeof ExpenseTransitionSchema>;

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

export const ExpenseActionPlacementSchema = z.enum([
  "primary", // Max 1, rightmost prominent button
  "secondary", // 0-2, adjacent to primary
  "overflow", // Dropdown menu
  "danger", // Separate danger zone in overflow
]);
export type ExpenseActionPlacement = z.infer<typeof ExpenseActionPlacementSchema>;

export const ExpenseHttpMethodSchema = z.enum(["GET", "POST", "PATCH", "DELETE"]);
export type ExpenseHttpMethod = z.infer<typeof ExpenseHttpMethodSchema>;

export const ExpenseActionSchema = z.object({
  /** Unique identifier for action (e.g., "edit", "delete") */
  key: z.string(),

  /** User-facing label */
  label: z.string(),

  /** Icon name from shared icon set (optional) */
  icon: z.string().optional(),

  /** Where to place this action in the UI */
  placement: ExpenseActionPlacementSchema,

  /** Whether action can be invoked */
  enabled: z.boolean(),

  /** If disabled, explains why */
  reason: z.string().optional(),

  /** If true, requires confirmation before executing */
  dangerous: z.boolean(),

  /** Confirmation dialog title */
  confirmTitle: z.string().optional(),

  /** Confirmation dialog body */
  confirmMessage: z.string().optional(),

  /** Required input field for confirmation (e.g., "reason") */
  requiresInput: z.string().optional(),

  /** For navigation actions */
  href: z.string().optional(),

  /** For API actions */
  endpoint: z
    .object({
      method: ExpenseHttpMethodSchema,
      path: z.string(),
    })
    .optional(),
});
export type ExpenseAction = z.infer<typeof ExpenseActionSchema>;

// -----------------------------------------------------------------------------
// Editability
// -----------------------------------------------------------------------------

export const ExpenseEditabilitySchema = z.object({
  /** Can edit general details */
  canEdit: z.boolean(),

  /** If editing is restricted, explains why */
  reason: z.string().optional(),
});
export type ExpenseEditability = z.infer<typeof ExpenseEditabilitySchema>;

// -----------------------------------------------------------------------------
// Audit Info
// -----------------------------------------------------------------------------

export const ExpenseAuditInfoSchema = z.object({
  /** Whether changes to this record are tracked in audit log */
  trackChanges: z.boolean(),

  /** This is a placeholder for future audit log info */
  lastModifiedAt: z.string().optional(),
});
export type ExpenseAuditInfo = z.infer<typeof ExpenseAuditInfoSchema>;

// -----------------------------------------------------------------------------
// Complete Capabilities Contract
// -----------------------------------------------------------------------------

export const ExpenseCapabilitiesSchema = z.object({
  /** Current lifecycle status with display info */
  status: ExpenseStatusCapabilitySchema,

  /** Derived signal badges */
  badges: z.array(ExpenseBadgeSchema),

  /** Available status transitions with enablement/danger info */
  transitions: z.array(ExpenseTransitionSchema),

  /** Available actions with placement and enablement info */
  actions: z.array(ExpenseActionSchema),

  /** What parts of the record can be edited */
  editability: ExpenseEditabilitySchema,

  /** Audit trail information */
  audit: ExpenseAuditInfoSchema,
});
export type ExpenseCapabilities = z.infer<typeof ExpenseCapabilitiesSchema>;
