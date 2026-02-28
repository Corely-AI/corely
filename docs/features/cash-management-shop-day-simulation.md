# Cash Management: Simple Full-Day Shop Simulation

This guide simulates one full day of operation in a small shop using the Cash Management module.

## Goal

Validate a realistic daily workflow end-to-end:

1. open register,
2. record normal cash activity,
3. close day (Kassensturz),
4. create post-close correction,
5. generate exports.

## Sample Setup

- Currency: `EUR`
- Register name: `Main Shop Register`
- Location: `Front Desk`
- Day: `2026-02-27`

## Quick Route Map

- Registers list: `/cash/registers`
- New register: `/cash/registers/new`
- Register detail: `/cash/registers/:id`
- Edit register: `/cash/registers/:id/edit`
- Entries list: `/cash/registers/:id/entries`
- Day close: `/cash/registers/:id/day-close?day=YYYY-MM-DD`
- Exports: `/cash/registers/:id/exports`

## Detailed Click Flow

### 1. Create Register

1. Go to `/cash/registers`.
2. Click `New register`.
3. In `/cash/registers/new`, fill:
   - `Name`: `Main Shop Register`
   - `Location`: `Front Desk`
   - `Currency`: `EUR`
4. Click `Create register`.
5. Expected: Redirect to `/cash/registers/:id`.

### 2. Enter Opening Float (Start of Day)

1. On register detail page (`/cash/registers/:id`), click `New cash entry`.
2. In entry dialog:
   - `Direction`: `IN`
   - `Type`: `OPENING_FLOAT`
   - `Payment method`: `CASH`
   - `Description`: `Opening float`
   - `Amount`: `200.00`
3. Click `Create entry`.
4. Expected:
   - Entry appears in entries list.
   - Register balance increases by `200.00`.

### 3. Record Morning Cash Sales

1. Navigate to `/cash/registers/:id/entries`.
2. Click `New cash entry` and create 2 sales:
   - Sale 1: `IN`, `SALE_CASH`, `120.00`, description `Morning sale A`
   - Sale 2: `IN`, `SALE_CASH`, `80.00`, description `Morning sale B`
3. Expected:
   - Both entries visible.
   - Entry numbers increment sequentially.
   - Saldo increases correctly.

### 4. Record Petty Cash Expense

1. Still on entries page, click `New cash entry`.
2. Create:
   - `Direction`: `OUT`
   - `Type`: `EXPENSE_CASH`
   - `Amount`: `25.00`
   - `Description`: `Cleaning supplies`
3. Click `Create entry`.
4. Expected: balance decreases by `25.00`.

### 5. Attach Beleg to Expense Entry

1. On the `Cleaning supplies` row, open row actions.
2. Click `Add beleg`.
3. Enter a valid `documentId`.
4. Confirm attachment.
5. Expected:
   - Paperclip icon appears for the row.
   - Attachment listed by attachment query/API.

### 6. Reverse an Incorrect Entry

1. Pick one incorrect entry (example: `Morning sale B` if entered wrongly).
2. Row actions -> click `Reverse`.
3. Enter reason: `Wrong amount entered`.
4. Confirm.
5. Expected:
   - Reversal entry created once.
   - Original entry marked as reversed/linked.
   - Saldo corrected.

### 7. Close Day (Kassensturz)

1. Go to `/cash/registers/:id/day-close?day=2026-02-27`.
2. Verify `Expected balance (Soll)` value.
3. Enter denomination counts to match physical cash.
4. If `Difference != 0`, add note in `Note`.
5. Click `Submit and lock day`.
6. Expected:
   - Day close status becomes `SUBMITTED`.
   - Day is locked.
   - Screen becomes read-only except correction path.

### 8. Add Post-Close Correction

1. From closed day screen, click `Add correction entry`.
2. Create:
   - `Direction`: `IN` or `OUT` as needed
   - `Type`: `CORRECTION`
   - `Description`: `Post-close correction`
3. Expected:
   - Correction entry is allowed.
   - Locked-day regular entries remain blocked.

### 9. Export End-of-Day Files

1. Go to `/cash/registers/:id/exports`.
2. Set:
   - `Month`: `2026-02`
   - `Format`: run all: `CSV`, `PDF`, `DATEV`, `AUDIT_PACK`
3. Click `Generate export` for each format.
4. Click `Download export`.
5. Expected:
   - CSV downloads with cashbook headers and rows.
   - PDF downloads and opens.
   - DATEV export file contains EXTF columns.
   - AUDIT_PACK zip contains:
     - `manifest.json`
     - `cashbook.csv`
     - `day-closes.csv`
     - `attachments.csv`
     - `audit-log.csv`

## Expected End-of-Day Validation

- Register has complete immutable sequence of entries.
- Reversal/correction entries are explicit (no silent edits).
- Day close is submitted and locked.
- Export artifacts are downloadable.
- Beleg link exists on at least one entry.
