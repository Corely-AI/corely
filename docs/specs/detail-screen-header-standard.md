# Standardize Status + Actions UI for Corely ERP

## Record Command Bar Specification

**Version:** 1.0  
**Date:** 21 January 2026  
**Scope:** Invoice (first), extensible to all record detail screens

---

## Table of Contents

1. [Invoice Header Inventory (Current State)](#1-invoice-header-inventory-current-state)
2. [Record Command Bar Specification](#2-record-command-bar-specification)
3. [Invoice Lifecycle & Transitions](#3-invoice-lifecycle--transitions)
4. [Invoice Actions Catalog](#4-invoice-actions-catalog)
5. [Capabilities Contract (Business Shape)](#5-capabilities-contract-business-shape)
6. [Invoice Screen Update Plan](#6-invoice-screen-update-plan)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Invoice Header Inventory (Current State)

### 1.1 Visible Header Elements

| Element               | Location    | Current Behavior                                        | Issue                         |
| --------------------- | ----------- | ------------------------------------------------------- | ----------------------------- |
| Back button           | Left        | Ghost icon button navigates to `/invoices`              | None                          |
| Title                 | Left        | "Edit Invoice {number \| Draft}"                        | None                          |
| Subtitle              | Left        | "Created {date}"                                        | None                          |
| **Status dropdown**   | Right       | Free-form `<Select>` with DRAFT, ISSUED, SENT, CANCELED | ⚠️ Allows invalid transitions |
| **Status badge**      | Right (far) | `<Badge variant={status}>` displays same status         | ⚠️ **Duplicate of dropdown**  |
| Download PDF button   | Right       | Outline button, shown when status ≠ DRAFT               | None                          |
| Record payment button | Right       | Accent button, opens dialog; shown when status ≠ PAID   | None                          |

### 1.2 Current Invoice Lifecycle Statuses (from `InvoiceStatusSchema`)

| Status     | Business Definition                                                          |
| ---------- | ---------------------------------------------------------------------------- |
| `DRAFT`    | Initial state; editable content, no invoice number assigned yet              |
| `ISSUED`   | Finalized with number and `issuedAt` timestamp; immutable except notes/terms |
| `SENT`     | Email delivery queued/sent to customer (sets `sentAt`)                       |
| `PAID`     | When `totals.paidCents >= totals.totalCents` after payment recording         |
| `CANCELED` | Voided; cannot record further payments                                       |

### 1.3 Current Actions Available

| Action             | Trigger                                | Availability                                | Notes                                     |
| ------------------ | -------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| **Download PDF**   | `invoicesApi.downloadInvoicePdf()`     | status ≠ DRAFT                              | Waits/retries until ready, then opens PDF |
| **Record payment** | Dialog → `invoicesApi.recordPayment()` | status ≠ PAID                               | Sets amount, date, optional note          |
| **Finalize**       | `invoicesApi.finalizeInvoice()`        | Implicit via status dropdown (DRAFT→ISSUED) | Hidden in status change flow              |
| **Send**           | `invoicesApi.sendInvoice()`            | Implicit via status dropdown (→SENT)        | Auto-finalizes if needed                  |
| **Cancel**         | `invoicesApi.cancelInvoice()`          | Via status dropdown (→CANCELED)             | Requires reason, currently optional       |
| **Update**         | `invoicesApi.updateInvoice()`          | Always (via form submit)                    | Header fields + line items                |

### 1.4 Identified UX Problems

1. **Duplicate status surface**: Badge AND dropdown both show status; confusing about which is authoritative.
2. **Free-form status dropdown**: Allows selecting any status, but backend rejects invalid transitions with an error toast.
3. **Missing transition explanations**: When a transition fails, user sees generic "Could not update invoice status" without business explanation.
4. **No dangerous action separation**: Cancel is in same dropdown as Issue/Sent; no confirmation required.
5. **No "Overdue" indicator**: Despite having `dueDate` and `totals.dueCents`, there's no visual signal for overdue invoices.
6. **Inconsistent with other screens**: Compare to `QuoteDetailPage` (badge only, actions as buttons) and `PurchaseOrderDetailPage` (inline buttons, no dropdown).

### 1.5 Cross-Screen Inconsistencies

| Screen             | Status Display               | Actions Pattern                                       |
| ------------------ | ---------------------------- | ----------------------------------------------------- |
| **Invoice**        | Dropdown + Badge (duplicate) | Record payment dialog, status via dropdown            |
| **Quote**          | Badge only                   | Send/Accept/Reject/Convert as discrete buttons        |
| **Purchase Order** | Badge only                   | Approve/Send/Receive/Close/Cancel as discrete buttons |
| **Vendor Bill**    | Badge only                   | Approve/Post/Record Payment/Void as discrete buttons  |

**Conclusion**: Invoice is the outlier with its status dropdown pattern. Other screens use consistent "badge + action buttons" model.

---

## 2. Record Command Bar Specification

### 2.1 Component Name

**`DetailScreenHeader`** (alternatively: `DetailScreenHeaderActions`)

### 2.2 Purpose

A standardized, reusable component pattern for displaying:

- Record lifecycle status
- Derived status signals (badges)
- Contextual actions based on business rules

### 2.3 Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Back]  [Title/Subtitle]       │        [Status Chip]  [Secondary] [Primary] │
│                                │                       [Overflow ⋮]          │
└────────────────────────────────────────────────────────────────────────────┘
         LEFT ZONE                         CENTER        RIGHT ZONE (ACTIONS)
```

| Zone       | Contents                                                                                    | Alignment    |
| ---------- | ------------------------------------------------------------------------------------------- | ------------ |
| **Left**   | Back button (optional), Record title + number, Subtitle (created date, customer name, etc.) | Left         |
| **Center** | Status Chip (interactive), Derived badges (read-only)                                       | Center-right |
| **Right**  | Primary action button, Secondary actions (0-2), Overflow menu                               | Right        |

### 2.4 Status Chip Component

#### Behavior Model:

- **Single source of truth** for lifecycle status display
- **Clickable** to open a **Transitions Popover** showing available state transitions
- **NOT a free-form dropdown**; only allowed transitions appear as options
- Uses consistent color coding per status (via design tokens)

#### Status Chip Visual:

```
┌─────────────────┐
│ ● ISSUED      ▾ │  ← Dot + label + chevron indicating interactivity
└─────────────────┘
```

#### Transitions Popover:

```
┌───────────────────────────────────────┐
│ Change status                         │
├───────────────────────────────────────┤
│ ✓ ISSUED (current)                    │  ← Current highlighted
│   SENT                                │  ← Available transition
│   ─────────────────────────────────── │
│ ⚠ Cancel Invoice                      │  ← Dangerous, separated
│   └ Requires reason. Irreversible.    │
├───────────────────────────────────────┤
│ ⓘ Status changes are tracked in       │
│   audit log                           │
└───────────────────────────────────────┘
```

#### Disabled Transition Behavior:

When a transition is not available, it can optionally appear with explanation:

```
│   PAID (disabled)                     │
│   └ Requires payment record first     │  ← WHY it's disabled
```

### 2.5 Derived Badges

Derived badges are **read-only signals** that reflect computed state, not lifecycle status:

| Badge             | Trigger Condition                                                        | Tone            |
| ----------------- | ------------------------------------------------------------------------ | --------------- |
| `OVERDUE`         | status ∈ [ISSUED, SENT] AND dueDate < today AND dueCents > 0             | Warning (amber) |
| `PAID`            | totals.paidCents >= totals.totalCents (may co-exist with lifecycle PAID) | Success (green) |
| `PARTIALLY PAID`  | 0 < totals.paidCents < totals.totalCents                                 | Info (blue)     |
| `SENT` (delivery) | sentAt is set (can show even if lifecycle moved to PAID)                 | Neutral         |

**Note**: These supplement (do not replace) the lifecycle status chip.

### 2.6 Action Placement Rules

| Category      | Description                                | Placement                                           | Limit         | Styling                                      |
| ------------- | ------------------------------------------ | --------------------------------------------------- | ------------- | -------------------------------------------- |
| **Primary**   | The "next best step" in the lifecycle      | Rightmost, prominent                                | **Exactly 1** | `variant="accent"` (filled, brand color)     |
| **Secondary** | Frequent but not essential for progression | Adjacent to primary                                 | **0-2**       | `variant="outline"` or `variant="secondary"` |
| **Overflow**  | All other actions                          | Dropdown menu (⋮)                                   | Unlimited     | Grouped by category                          |
| **Danger**    | Destructive/irreversible actions           | Separate section in overflow OR transitions popover | N/A           | Red text, requires confirmation              |

#### Overflow Menu Structure:

```
┌─────────────────────────────────┐
│ Actions                         │
├─────────────────────────────────┤
│ 📄 Download PDF                 │
│ 📧 Send Email                   │
│ 🔔 Send Reminder                │
│ ─────────────────────────────── │
│ Other                           │
├─────────────────────────────────┤
│ 📋 Duplicate Invoice            │
│ 📤 Export to CSV                │
│ 📜 View Audit Log               │
│ ─────────────────────────────── │
│ Danger Zone                     │
├─────────────────────────────────┤
│ ⚠ Cancel Invoice                │
│ ⚠ Void Invoice                  │
└─────────────────────────────────┘
```

### 2.7 Accessibility Requirements

| Requirement         | Implementation                                                    |
| ------------------- | ----------------------------------------------------------------- |
| Keyboard navigation | All buttons and menu items focusable in tab order                 |
| Status chip         | Role="button", aria-haspopup="menu"                               |
| Transitions popover | Role="menu" with aria-labelledby                                  |
| Disabled items      | aria-disabled="true" + visually distinct + tooltip explaining why |
| Danger actions      | aria-describedby pointing to confirmation description             |
| Screen reader       | Status changes announced via live region                          |
| Focus management    | After status change, return focus to status chip                  |

### 2.8 Confirmation Patterns

**Standard confirmation** (for dangerous actions):

```
┌───────────────────────────────────────────┐
│ Cancel Invoice INV-2026-0001?             │
├───────────────────────────────────────────┤
│ This action is irreversible. The invoice  │
│ will be marked as canceled and no further │
│ payments can be recorded.                 │
│                                           │
│ Reason (required):                        │
│ ┌─────────────────────────────────────┐   │
│ │ Customer requested cancellation     │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ ⓘ This action will be logged in the       │
│   audit trail.                            │
├───────────────────────────────────────────┤
│              [Cancel]  [Confirm Cancel]   │
└───────────────────────────────────────────┘
```

---

## 3. Invoice Lifecycle & Transitions

### 3.1 Lifecycle Status Semantics

| Status       | Definition                                                     | Editable Fields                           | UI Tone                  |
| ------------ | -------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| **DRAFT**    | Initial state; invoice content is editable; no number assigned | Customer, dates, line items, notes, terms | `muted` (gray)           |
| **ISSUED**   | Finalized with number + `issuedAt`; legally binding            | notes, terms only                         | `default` (blue/neutral) |
| **SENT**     | Email delivery was triggered; `sentAt` set                     | notes, terms only                         | `accent` (brand)         |
| **PAID**     | `paidCents >= totalCents`; automatically set on payment        | notes only                                | `success` (green)        |
| **CANCELED** | Voided; no further mutations                                   | None                                      | `destructive` (red)      |

### 3.2 What Is NOT Lifecycle (Derived Signals)

| Signal              | Source                                                         | Display                                |
| ------------------- | -------------------------------------------------------------- | -------------------------------------- |
| **Overdue**         | `dueDate < now() AND status ∈ [ISSUED, SENT] AND dueCents > 0` | Derived badge                          |
| **Partially Paid**  | `0 < paidCents < totalCents`                                   | Derived badge                          |
| **Sent (delivery)** | `sentAt IS NOT NULL`                                           | Could be badge OR lifecycle; see below |
| **PDF Ready**       | `pdfStatus = READY`                                            | Action enablement, not badge           |

### 3.3 "Sent" Classification Decision

**Recommendation**: `SENT` should remain a **lifecycle status** (not just a badge) because:

1. It represents a business-meaningful checkpoint (customer received invoice).
2. It affects audit expectations (sent date is often legal evidence).
3. Backend already enforces it as a distinct state with `markSent()` method.

If in future, email delivery becomes asynchronous/unreliable, consider:

- Making `sentAt` a nullable timestamp (already done)
- Adding a "delivery pending" derived badge for in-progress sends

### 3.4 Transitions Table

| From     | To       | Transition Name | Conditions                               | Permissions             | Side Effects                                | Dangerous? |
| -------- | -------- | --------------- | ---------------------------------------- | ----------------------- | ------------------------------------------- | ---------- |
| DRAFT    | ISSUED   | **Finalize**    | Has customer, ≥1 line item, bill-to name | `invoice:finalize`      | Assigns number, sets issuedAt, triggers PDF | No         |
| DRAFT    | CANCELED | **Cancel**      | None                                     | `invoice:cancel`        | Sets notes to reason                        | Yes        |
| ISSUED   | SENT     | **Send**        | Email address available                  | `invoice:send`          | Sets sentAt, queues email, triggers PDF     | No         |
| ISSUED   | CANCELED | **Cancel**      | No payments recorded                     | `invoice:cancel`        | None                                        | Yes        |
| ISSUED   | PAID     | _(Auto)_        | `paidCents >= totalCents`                | N/A (via recordPayment) | Status auto-updated                         | No         |
| SENT     | CANCELED | **Cancel**      | No payments recorded                     | `invoice:cancel`        | None                                        | Yes        |
| SENT     | PAID     | _(Auto)_        | `paidCents >= totalCents`                | N/A (via recordPayment) | Status auto-updated                         | No         |
| PAID     | _(none)_ | _(Terminal)_    | N/A                                      | N/A                     | N/A                                         | N/A        |
| CANCELED | _(none)_ | _(Terminal)_    | N/A                                      | N/A                     | N/A                                         | N/A        |

### 3.5 Transition Diagram

```
                ┌──────────┐
                │  DRAFT   │
                └────┬─────┘
                     │ Finalize
            ┌────────┴────────┐
            │                 │ Cancel
            ▼                 ▼
       ┌──────────┐    ┌───────────┐
       │  ISSUED  │───►│ CANCELED  │
       └────┬─────┘    └───────────┘
            │ Send            ▲
            ▼                 │ Cancel
       ┌──────────┐           │
       │   SENT   │───────────┤
       └────┬─────┘           │
            │ Record Payment  │
            │ (auto when paid)│
            ▼                 │
       ┌──────────┐           │
       │   PAID   │           │
       └──────────┘           │
           ★ Terminal         ★ Terminal
```

---

## 4. Invoice Actions Catalog

### 4.1 Actions by Lifecycle Status

| Status       | Primary Action     | Secondary Actions           | Overflow Actions              | Danger Actions |
| ------------ | ------------------ | --------------------------- | ----------------------------- | -------------- |
| **DRAFT**    | **Issue Invoice**  | Download Preview            | Duplicate, Save changes       | Cancel         |
| **ISSUED**   | **Record Payment** | Send Email, Download PDF    | Duplicate, Export, View audit | Cancel         |
| **SENT**     | **Record Payment** | Send Reminder, Download PDF | Duplicate, Export, View audit | Cancel         |
| **PAID**     | (none)             | Download PDF                | Duplicate, Export, View audit | (none)         |
| **CANCELED** | (none)             | Download PDF                | View audit                    | (none)         |

### 4.2 Action Definitions

| Action               | Display Label              | Icon            | Trigger                                               | Returns                     | Idempotent?               |
| -------------------- | -------------------------- | --------------- | ----------------------------------------------------- | --------------------------- | ------------------------- |
| **Issue Invoice**    | "Issue" or "Issue Invoice" | FileCheck       | POST `/invoices/{id}/finalize`                        | Updated invoice with number | Yes (via idempotency key) |
| **Record Payment**   | "Record Payment"           | CreditCard      | Dialog → POST `/invoices/{id}/payments`               | Updated invoice             | No (each payment unique)  |
| **Send Email**       | "Send" or "Send Email"     | Mail            | POST `/invoices/{id}/send`                            | Delivery status             | Yes                       |
| **Send Reminder**    | "Send Reminder"            | Bell            | POST `/invoices/{id}/send` (with type=reminder)       | Delivery status             | Yes                       |
| **Download PDF**     | "Download PDF"             | Download        | GET `/invoices/{id}/pdf?waitMs=15000` (repeat on 202) | Signed URL when READY       | Yes (safe repeated calls) |
| **Download Preview** | "Download Preview"         | Eye             | Same as PDF but for draft                             | Signed URL                  | N/A                       |
| **Cancel**           | "Cancel Invoice"           | XCircle         | Dialog → POST `/invoices/{id}/cancel`                 | Updated invoice             | Yes (idempotent)          |
| **Duplicate**        | "Duplicate"                | Copy            | POST `/invoices` (with copy data)                     | New draft invoice           | No                        |
| **Export**           | "Export to CSV/Excel"      | FileSpreadsheet | Client-side or GET                                    | File download               | N/A                       |
| **View Audit**       | "View Audit Log"           | History         | Navigate to `/audit?entity=invoice&id={id}`           | N/A                         | N/A                       |

### 4.3 Action Gating

#### Permission Gating (RBAC/ABAC):

| Permission               | Required For                   |
| ------------------------ | ------------------------------ |
| `invoice:read`           | View invoice, download PDF     |
| `invoice:update`         | Edit draft, update notes/terms |
| `invoice:finalize`       | Issue invoice (DRAFT→ISSUED)   |
| `invoice:send`           | Send email to customer         |
| `invoice:payment:record` | Record payment                 |
| `invoice:cancel`         | Cancel/void invoice            |
| `invoice:create`         | Duplicate (creates new)        |

#### Dependency Gating:

| Action       | Dependencies                             | Override Behavior                                  |
| ------------ | ---------------------------------------- | -------------------------------------------------- |
| Issue        | ≥1 line item, customer set, bill-to name | Show validation errors                             |
| Send         | Email address on bill-to or customer     | Prompt to add email                                |
| Cancel       | If status = PAID: blocked                | No override available                              |
| Download PDF | PDF must be generated asynchronously     | Show generating state, poll until READY or timeout |

#### Approval Gating (Future):

If approval workflows are enabled for invoices:

- Issue may require approval for amounts > threshold
- Cancel may require manager approval

---

## 5. Capabilities Contract (Business Shape)

### 5.1 Overview

The UI must not embed domain logic (e.g., hardcoded status transition rules). Instead, the Invoice domain exposes a **capabilities** object as part of the invoice response or via a dedicated endpoint.

### 5.2 Contract Shape

```
InvoiceCapabilities {
  // Current lifecycle status
  status: {
    value: string            // "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED"
    label: string            // "Draft", "Issued", etc. (localized)
    tone: string             // "muted" | "accent" | "success" | "destructive"
  }

  // Derived signal badges
  badges: Array<{
    key: string              // "OVERDUE" | "PARTIALLY_PAID" | "SENT_DELIVERY"
    label: string            // "Overdue", "Partially Paid", etc.
    tone: string             // "warning" | "info" | etc.
  }>

  // Available status transitions
  transitions: Array<{
    to: string               // Target status
    label: string            // "Send to Customer"
    enabled: boolean         // Can be invoked
    reason?: string          // If disabled, why (localized)
    dangerous: boolean       // Requires confirmation
    confirmTitle?: string    // Dialog title if dangerous
    confirmMessage?: string  // Dialog body if dangerous
    requiresInput?: string   // e.g., "reason" for cancellation
  }>

  // Available actions
  actions: Array<{
    key: string              // Unique action identifier
    label: string            // Display label
    icon?: string            // Icon name (from shared icon set)
    placement: string        // "primary" | "secondary" | "overflow" | "danger"
    enabled: boolean
    reason?: string          // If disabled, why
    dangerous: boolean
    confirmTitle?: string
    confirmMessage?: string
    requiresInput?: string
    href?: string            // For navigation actions
    endpoint?: {             // For API actions
      method: string         // "POST" | "GET"
      path: string           // "/invoices/{id}/finalize"
    }
  }>

  // Context about editability
  editability: {
    canEditHeader: boolean
    canEditDates: boolean
    canEditLineItems: boolean
    reason?: string          // Why editing is restricted
  }

  // Audit expectations
  audit: {
    trackChanges: boolean    // Status changes are logged
    lastModifiedBy?: string
    lastModifiedAt?: string
  }
}
```

### 5.3 How UI Uses Capabilities

1. **Status Chip**: Uses `capabilities.status` for display, `capabilities.transitions` for popover options.
2. **Derived Badges**: Renders `capabilities.badges` as read-only pills.
3. **Actions**: Iterates `capabilities.actions`, places by `placement`, respects `enabled` + `reason`.
4. **Confirmations**: Actions with `dangerous: true` use `confirmTitle`/`confirmMessage` for dialog.
5. **Form editability**: Uses `capabilities.editability` to disable fields.

### 5.4 Backend Implementation Notes

- Capabilities can be computed **server-side** on each `getInvoice` call.
- Alternatively, expose `GET /invoices/{id}/capabilities` as a separate endpoint.
- Labels should be **localized** based on Accept-Language header.
- **Cacheability**: Capabilities change only when invoice state changes; can use ETag.

### 5.5 Contracts-First Approach

Per `docs/architect.md`, this shape should be defined in `packages/contracts/src/invoices/`:

```typescript
// invoice-capabilities.schema.ts
import { z } from "zod";

export const InvoiceStatusCapabilitySchema = z.object({
  value: InvoiceStatusSchema,
  label: z.string(),
  tone: z.enum(["muted", "default", "accent", "success", "destructive"]),
});

export const InvoiceBadgeSchema = z.object({
  key: z.enum(["OVERDUE", "PARTIALLY_PAID", "SENT_DELIVERY"]),
  label: z.string(),
  tone: z.enum(["warning", "info", "success", "muted"]),
});

export const InvoiceTransitionSchema = z.object({
  to: InvoiceStatusSchema,
  label: z.string(),
  enabled: z.boolean(),
  reason: z.string().optional(),
  dangerous: z.boolean(),
  confirmTitle: z.string().optional(),
  confirmMessage: z.string().optional(),
  requiresInput: z.string().optional(),
});

export const InvoiceActionSchema = z.object({
  key: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  placement: z.enum(["primary", "secondary", "overflow", "danger"]),
  enabled: z.boolean(),
  reason: z.string().optional(),
  dangerous: z.boolean(),
  confirmTitle: z.string().optional(),
  confirmMessage: z.string().optional(),
  requiresInput: z.string().optional(),
  href: z.string().optional(),
  endpoint: z
    .object({
      method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
      path: z.string(),
    })
    .optional(),
});

export const InvoiceEditabilitySchema = z.object({
  canEditHeader: z.boolean(),
  canEditDates: z.boolean(),
  canEditLineItems: z.boolean(),
  reason: z.string().optional(),
});

export const InvoiceCapabilitiesSchema = z.object({
  status: InvoiceStatusCapabilitySchema,
  badges: z.array(InvoiceBadgeSchema),
  transitions: z.array(InvoiceTransitionSchema),
  actions: z.array(InvoiceActionSchema),
  editability: InvoiceEditabilitySchema,
  audit: z.object({
    trackChanges: z.boolean(),
    lastModifiedBy: z.string().optional(),
    lastModifiedAt: z.string().optional(),
  }),
});

export type InvoiceCapabilities = z.infer<typeof InvoiceCapabilitiesSchema>;
```

---

## 6. Invoice Screen Update Plan

### 6.1 Before/After Summary

| Aspect            | Before                                       | After                                            |
| ----------------- | -------------------------------------------- | ------------------------------------------------ |
| Status display    | Dropdown + Badge (duplicate)                 | Single Status Chip with transitions popover      |
| Status changes    | Free-form dropdown selection                 | Constrained transitions with explanations        |
| Actions           | Record payment button + status dropdown      | Primary/Secondary/Overflow consistent pattern    |
| Visual hierarchy  | No clear primary action                      | "Issue" or "Record Payment" as prominent primary |
| Overdue indicator | None                                         | Derived badge shown automatically                |
| Cancel            | In status dropdown, no confirmation          | In danger zone with confirmation dialog          |
| PDF download      | Outline button, always visible for non-draft | Contextual placement                             |

### 6.2 Header Layout by Status

#### DRAFT:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [←]  Edit Invoice Draft                  [● DRAFT ▾]        [▾] [Issue]   │
│      Created Jan 21, 2026                                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

- Primary: **Issue** (accent button)
- Overflow: Save changes, Duplicate, Cancel (danger section)
- Status Chip: DRAFT (muted), transitions: ISSUED, CANCELED

#### ISSUED:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [←]  Invoice INV-2024-0042               [● ISSUED ▾]  [Send] [Record     │
│      Customer: Acme Corp                  [OVERDUE]           Payment]     │
└────────────────────────────────────────────────────────────────────────────┘
```

- Primary: **Record Payment** (accent)
- Secondary: **Send** (outline)
- Overflow: Download PDF, Duplicate, Export, View audit, Cancel
- Badges: OVERDUE (if applicable)
- Status Chip: ISSUED (default), transitions: SENT, CANCELED

#### SENT + Partially Paid:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [←]  Invoice INV-2024-0042               [● SENT ▾]         [Download]    │
│      Customer: Acme Corp           [PARTIALLY PAID]          [Record      │
│                                                               Payment]     │
└────────────────────────────────────────────────────────────────────────────┘
```

- Primary: **Record Payment** (accent)
- Secondary: **Download PDF** (outline)
- Overflow: Send Reminder, Duplicate, Export, View audit, Cancel
- Badges: PARTIALLY PAID
- Status Chip: SENT (accent), transitions: CANCELED (dangerous)

#### PAID:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [←]  Invoice INV-2024-0042               [● PAID ✓]         [Download]    │
│      Customer: Acme Corp                  [PAID]                  [▾]      │
└────────────────────────────────────────────────────────────────────────────┘
```

- Primary: None (terminal state)
- Secondary: **Download PDF** (outline)
- Overflow: Duplicate, Export, View audit
- Badges: (PAID badge redundant with status, consider hiding)
- Status Chip: PAID (success), no transitions

#### CANCELED:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [←]  Invoice INV-2024-0042               [● CANCELED]       [Download]    │
│      Customer: Acme Corp                                          [▾]     │
└────────────────────────────────────────────────────────────────────────────┘
```

- Primary: None (terminal state)
- Secondary: **Download PDF** (outline)
- Overflow: View audit
- Status Chip: CANCELED (destructive), no transitions

### 6.3 Specific Changes to `InvoiceDetailPage.tsx`

1. **Remove**: Status dropdown (`<Select>` lines 308-324)
2. **Remove**: Duplicate status badge (line 392)
3. **Add**: `<DetailScreenHeader>` component with capabilities prop
4. **Add**: Derived badges (OVERDUE, PARTIALLY_PAID)
5. **Change**: Move "Record Payment" to primary action slot
6. **Add**: Overflow menu with grouped actions
7. **Add**: Proper confirmation dialog for Cancel action

### 6.4 New Component Usage

```tsx
<DetailScreenHeader
  title={`Invoice ${invoice.number ?? "Draft"}`}
  subtitle={`Created ${formatDate(invoice.createdAt)}`}
  capabilities={invoice.capabilities}
  onTransition={handleTransition}
  onAction={handleAction}
  onBack={() => navigate("/invoices")}
/>
```

---

## 7. Acceptance Criteria

### 7.1 Core Requirements

| ID    | Requirement                                                                                         | Validation                                          |
| ----- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| AC-01 | **Single status surface**: Only one interactive element displays/controls status (Status Chip)      | Visual inspection: no duplicate badge + dropdown    |
| AC-02 | **Constrained transitions**: Status changes limited to allowed transitions from capability contract | Attempts to change from PAID should show no options |
| AC-03 | **Disabled transitions with explanation**: When a transition is blocked, UI shows why               | Hover/tooltip on disabled transition shows reason   |
| AC-04 | **Exactly one Primary action per state**                                                            | Each status has at most one accent-colored button   |
| AC-05 | **0-2 Secondary actions**                                                                           | Secondary buttons use outline style                 |
| AC-06 | **Overflow for remaining actions**                                                                  | All other actions in dropdown menu                  |
| AC-07 | **Danger actions separated**                                                                        | Cancel/Void in separate section with red text       |
| AC-08 | **Confirmation for dangerous actions**                                                              | Cancel shows dialog with reason input               |
| AC-09 | **Audit expectations visible**                                                                      | UI indicates "Changes are tracked"                  |

### 7.2 Architecture Compliance

| ID      | Corely Architecture Rule (from `docs/architect.md`) | Compliance                                         |
| ------- | --------------------------------------------------- | -------------------------------------------------- |
| ARCH-01 | Domain logic stays in domain folders                | Business rules in `InvoiceAggregate`, not UI       |
| ARCH-02 | Modules communicate via contracts/events            | `InvoiceCapabilitiesSchema` in `@corely/contracts` |
| ARCH-03 | Web/POS consume contracts, never import backend     | UI uses capability contract shape                  |
| ARCH-04 | RFC 7807 error model                                | Transition failures return Problem Details         |
| ARCH-05 | Idempotency enforcement                             | All POST actions use idempotency keys              |
| ARCH-06 | Audit logging                                       | Status transitions logged via audit adapter        |

### 7.3 Accessibility Requirements

| ID      | Requirement                                 | Validation                                       |
| ------- | ------------------------------------------- | ------------------------------------------------ |
| A11Y-01 | Status chip is keyboard accessible          | Focus + Enter opens transitions                  |
| A11Y-02 | Overflow menu keyboard navigable            | Arrow keys move through items                    |
| A11Y-03 | Disabled items have aria-disabled + tooltip | Screen reader announces "disabled"               |
| A11Y-04 | Confirmation dialogs trap focus             | Tab cycles within dialog                         |
| A11Y-05 | Status changes announced                    | Live region announces "Status changed to Issued" |

### 7.4 Cross-Platform Considerations

| ID       | Requirement                             | Implementation                                          |
| -------- | --------------------------------------- | ------------------------------------------------------- |
| XPLAT-01 | POS uses same capability contract       | Shared schema in `@corely/contracts`                    |
| XPLAT-02 | POS may have different action placement | Capability includes `platform` variant option           |
| XPLAT-03 | Localization support                    | Labels in capability contract are localized server-side |

---

## Appendix A: Implementation Checklist

### Phase 1: Contracts & Domain (Backend)

- [ ] Add `InvoiceCapabilitiesSchema` to `packages/contracts/src/invoices/`
- [ ] Implement `buildCapabilities()` method in Invoice domain
- [ ] Include capabilities in `GetInvoiceOutput`
- [ ] Add derived badge computation (OVERDUE, PARTIALLY_PAID)

### Phase 2: UI Components (Frontend)

- [ ] Create `DetailScreenHeader` component in `apps/web/src/shared/components/`
- [ ] Create `StatusChip` with transitions popover
- [ ] Create `OverflowMenu` with grouped actions
- [ ] Add confirmation dialog pattern

### Phase 3: Invoice Screen Integration

- [ ] Refactor `InvoiceDetailPage.tsx` to use `DetailScreenHeader`
- [ ] Remove duplicate status controls
- [ ] Integrate capabilities from API response
- [ ] Update tests

### Phase 4: Rollout to Other Screens

- [ ] Quote detail page
- [ ] Sales Order detail page
- [ ] Purchase Order detail page
- [ ] Vendor Bill detail page

---

## Appendix B: Open Questions for Product Review

1. **"Void" vs "Cancel"**: Should we use one term consistently, or are they semantically different?
2. **Overdue threshold**: Is it exactly `dueDate < today` or should there be a grace period?
3. **Sent as lifecycle vs badge**: Confirm that SENT remains a lifecycle status.
4. **Approval workflows**: When will approval gating be added? Should we pre-wire the capability shape?
5. **Payment dialog on header vs inline**: Keep payment dialog or move to separate page?

---

_End of specification._
