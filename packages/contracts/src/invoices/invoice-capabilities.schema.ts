/**
 * Invoice Capabilities Contract
 *
 * Defines the shape of capabilities that the Invoice domain exposes to UI clients.
 * This enables UI to render status, badges, transitions, and actions without
 * embedding business logic - all rules come from the domain.
 *
 * @see docs/specs/record-command-bar-standard.md
 */

import { z } from "zod";
import { InvoiceStatusSchema } from "./invoice.types";

// -----------------------------------------------------------------------------
// Status Capability
// -----------------------------------------------------------------------------

export const StatusToneSchema = z.enum([
  "muted", // Draft, inactive states
  "default", // Normal/issued states
  "accent", // Active/sent states
  "success", // Completed/paid states
  "destructive", // Canceled/voided states
]);
export type StatusTone = z.infer<typeof StatusToneSchema>;

export const InvoiceStatusCapabilitySchema = z.object({
  value: InvoiceStatusSchema,
  label: z.string(),
  tone: StatusToneSchema,
});
export type InvoiceStatusCapability = z.infer<typeof InvoiceStatusCapabilitySchema>;

// -----------------------------------------------------------------------------
// Derived Badges
// -----------------------------------------------------------------------------

export const InvoiceBadgeKeySchema = z.enum([
  "OVERDUE", // dueDate < today AND status in [ISSUED, SENT] AND dueCents > 0
  "PARTIALLY_PAID", // 0 < paidCents < totalCents
  "SENT_DELIVERY", // sentAt is set (delivery confirmation)
]);
export type InvoiceBadgeKey = z.infer<typeof InvoiceBadgeKeySchema>;

export const BadgeToneSchema = z.enum([
  "warning", // Overdue
  "info", // Partially paid
  "success", // Paid/delivered
  "muted", // Informational
]);
export type BadgeTone = z.infer<typeof BadgeToneSchema>;

export const InvoiceBadgeSchema = z.object({
  key: InvoiceBadgeKeySchema,
  label: z.string(),
  tone: BadgeToneSchema,
});
export type InvoiceBadge = z.infer<typeof InvoiceBadgeSchema>;

// -----------------------------------------------------------------------------
// Status Transitions
// -----------------------------------------------------------------------------

export const InvoiceTransitionSchema = z.object({
  /** Target status after transition */
  to: InvoiceStatusSchema,

  /** User-facing label for the transition (e.g., "Send to Customer") */
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
export type InvoiceTransition = z.infer<typeof InvoiceTransitionSchema>;

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

export const ActionPlacementSchema = z.enum([
  "primary", // Max 1, rightmost prominent button
  "secondary", // 0-2, adjacent to primary
  "overflow", // Dropdown menu
  "danger", // Separate danger zone in overflow
]);
export type ActionPlacement = z.infer<typeof ActionPlacementSchema>;

export const HttpMethodSchema = z.enum(["GET", "POST", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const InvoiceActionSchema = z.object({
  /** Unique identifier for action (e.g., "record_payment", "download_pdf") */
  key: z.string(),

  /** User-facing label */
  label: z.string(),

  /** Icon name from shared icon set (optional) */
  icon: z.string().optional(),

  /** Where to place this action in the UI */
  placement: ActionPlacementSchema,

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

  /** For navigation actions (e.g., "/audit?entity=invoice&id={id}") */
  href: z.string().optional(),

  /** For API actions */
  endpoint: z
    .object({
      method: HttpMethodSchema,
      path: z.string(),
    })
    .optional(),
});
export type InvoiceAction = z.infer<typeof InvoiceActionSchema>;

// -----------------------------------------------------------------------------
// Editability
// -----------------------------------------------------------------------------

export const InvoiceEditabilitySchema = z.object({
  /** Can edit customer, currency, notes, terms */
  canEditHeader: z.boolean(),

  /** Can edit invoiceDate, dueDate */
  canEditDates: z.boolean(),

  /** Can add/remove/modify line items */
  canEditLineItems: z.boolean(),

  /** If editing is restricted, explains why */
  reason: z.string().optional(),
});
export type InvoiceEditability = z.infer<typeof InvoiceEditabilitySchema>;

// -----------------------------------------------------------------------------
// Audit Info
// -----------------------------------------------------------------------------

export const InvoiceAuditInfoSchema = z.object({
  /** Whether changes to this record are tracked in audit log */
  trackChanges: z.boolean(),

  /** Last modifier user ID or name */
  lastModifiedBy: z.string().optional(),

  /** Last modification timestamp (ISO 8601) */
  lastModifiedAt: z.string().optional(),
});
export type InvoiceAuditInfo = z.infer<typeof InvoiceAuditInfoSchema>;

// -----------------------------------------------------------------------------
// Complete Capabilities Contract
// -----------------------------------------------------------------------------

export const InvoiceCapabilitiesSchema = z.object({
  /** Current lifecycle status with display info */
  status: InvoiceStatusCapabilitySchema,

  /** Derived signal badges (OVERDUE, PARTIALLY_PAID, etc.) */
  badges: z.array(InvoiceBadgeSchema),

  /** Available status transitions with enablement/danger info */
  transitions: z.array(InvoiceTransitionSchema),

  /** Available actions with placement and enablement info */
  actions: z.array(InvoiceActionSchema),

  /** What parts of the record can be edited */
  editability: InvoiceEditabilitySchema,

  /** Audit trail information */
  audit: InvoiceAuditInfoSchema,
});
export type InvoiceCapabilities = z.infer<typeof InvoiceCapabilitiesSchema>;

// -----------------------------------------------------------------------------
// Enriched Invoice DTO (includes capabilities)
// -----------------------------------------------------------------------------

/**
 * Extended response shape that includes capabilities alongside invoice data.
 * API can return this from GET /invoices/{id} or from a separate capabilities endpoint.
 */
export const InvoiceWithCapabilitiesSchema = z.object({
  /** Standard invoice DTO fields would be spread here */
  capabilities: InvoiceCapabilitiesSchema,
});
export type InvoiceWithCapabilities = z.infer<typeof InvoiceWithCapabilitiesSchema>;
