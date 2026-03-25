Here are the **Phase 1 use cases** for the restaurant POS, written in a practical product/implementation style.

# Actors

- Cashier
- Server
- Manager
- Kitchen staff
- Admin

# 1. Open shift

**Actor:** Cashier
**Goal:** Start a working shift on a register with opening cash.

**Preconditions**

- User is authenticated
- User has permission for the register
- Register is assigned to the location

**Main flow**

1. Cashier selects register
2. Enters opening cash amount
3. System opens shift session
4. System records timestamp, user, register, opening balance
5. Audit log is created

**Result**

- Shift becomes active
- Cashier can take orders and payments

---

# 2. View floor plan

**Actor:** Server / Cashier
**Goal:** See table availability in real time.

**Preconditions**

- Dining rooms and tables are configured

**Main flow**

1. User opens floor plan
2. System loads rooms and tables
3. System shows table states:
   - available
   - occupied
   - optionally dirty / blocked

**Result**

- User can choose a table quickly

---

# 3. Open table

**Actor:** Server / Cashier
**Goal:** Start service for a guest table.

**Preconditions**

- Shift is active
- Table is available

**Main flow**

1. User taps table
2. User opens new table session
3. System marks table as occupied
4. System creates draft order/check linked to table session

**Result**

- Table is active and ready for ordering

---

# 4. Resume table

**Actor:** Server / Cashier
**Goal:** Continue editing an existing open table.

**Preconditions**

- Table has an active session

**Main flow**

1. User selects occupied table
2. System opens current order
3. Existing items, notes, totals, and status are shown

**Result**

- User continues service without losing context

---

# 5. Add menu items

**Actor:** Server / Cashier
**Goal:** Add ordered items to the table check.

**Preconditions**

- Table session is open
- Menu is available on device

**Main flow**

1. User browses or searches menu
2. Selects item
3. System adds item to draft order
4. System recalculates subtotal, tax, and total

**Result**

- Order reflects guest selections

---

# 6. Add modifiers

**Actor:** Server / Cashier
**Goal:** Customize ordered items.

**Examples**

- extra cheese
- no onions
- medium rare
- large size

**Preconditions**

- Selected item supports modifier groups

**Main flow**

1. User selects an item
2. System shows allowed modifiers
3. User chooses modifier options
4. System updates item price if needed
5. System stores modifier snapshot with item

**Result**

- Kitchen and billing both receive correct customization

---

# 7. Update or remove item before send

**Actor:** Server / Cashier
**Goal:** Correct draft order before it reaches kitchen.

**Preconditions**

- Item has not been finalized for kitchen or rules allow edit

**Main flow**

1. User edits quantity, notes, or modifiers
2. Or removes item
3. System recalculates totals
4. Audit event is recorded if needed

**Result**

- Draft remains accurate before kitchen submission

---

# 8. Send order to kitchen

**Actor:** Server / Cashier
**Goal:** Submit order items for preparation.

**Preconditions**

- Table session has unsent items

**Main flow**

1. User taps “Send”
2. System locks the sent items for kitchen workflow
3. System creates kitchen ticket(s)
4. System routes ticket to station if configured
5. Event is emitted for kitchen display / printer

**Result**

- Kitchen receives actionable ticket
- Items move from draft to sent state

---

# 9. View kitchen queue

**Actor:** Kitchen staff
**Goal:** See what must be prepared next.

**Preconditions**

- Kitchen tickets exist

**Main flow**

1. Kitchen screen loads ticket queue
2. Tickets are grouped by status or station
3. Staff sees table/check reference, items, modifiers, notes

**Result**

- Kitchen has clear operational visibility

---

# 10. Update kitchen ticket status

**Actor:** Kitchen staff
**Goal:** Mark progress on food preparation.

**Statuses**

- new
- in progress
- done / ready
- bumped / completed

**Preconditions**

- Ticket exists

**Main flow**

1. Staff opens ticket
2. Marks ticket in progress
3. Later marks it done or bumped
4. System updates ticket state
5. Changes become visible to POS/front-of-house

**Result**

- FOH knows whether order is still cooking or ready

---

# 11. Transfer table

**Actor:** Server / Manager
**Goal:** Move an active session to another table.

**Common cases**

- guests change seats
- larger party needs another table

**Preconditions**

- Source table is occupied
- Target table is available

**Main flow**

1. User selects transfer action
2. Chooses destination table
3. System moves table session and open check
4. Source table becomes available
5. Destination table becomes occupied

**Result**

- Service continues without re-entering order

---

# 12. Merge tables/checks

**Actor:** Server / Manager
**Goal:** Combine two active tables or checks.

**Common cases**

- two parties join together
- split seating becomes one bill

**Preconditions**

- Merge policy permits it
- Both sessions are open

**Main flow**

1. User selects merge
2. Chooses source and target
3. System combines order lines/check context
4. Source session is closed or linked as merged
5. Audit log records merge

**Result**

- One active check remains for payment

---

# 13. Request void

**Actor:** Cashier / Server
**Goal:** Remove an item or line that should not be billed.

**Preconditions**

- Void policy applies
- Item/order is in a state that allows void request

**Main flow**

1. User selects item/order to void
2. Enters reason
3. System creates approval request
4. Void is pending, not immediately applied

**Result**

- Unauthorized direct voids are prevented

---

# 14. Approve void

**Actor:** Manager
**Goal:** Authorize a pending void.

**Preconditions**

- Pending void request exists
- Manager has approval rights

**Main flow**

1. Manager opens approval queue
2. Reviews request and reason
3. Approves or rejects
4. If approved, system applies void and updates totals
5. Audit entry records approver and timestamp

**Result**

- Controlled loss prevention with traceability

---

# 15. Request discount

**Actor:** Cashier / Server
**Goal:** Apply a discount that needs authorization.

**Preconditions**

- Discount policy requires approval

**Main flow**

1. User selects discount type or custom discount
2. Enters reason
3. System creates approval request
4. Discount stays pending

**Result**

- Price changes are controlled

---

# 16. Approve discount

**Actor:** Manager
**Goal:** Authorize a pending discount.

**Preconditions**

- Pending discount request exists

**Main flow**

1. Manager reviews request
2. Approves or rejects
3. If approved, system recalculates totals
4. Audit trail is stored

**Result**

- Discount is applied lawfully and visibly

---

# 17. Review bill

**Actor:** Cashier / Server
**Goal:** Show final amount before payment.

**Preconditions**

- Order has billable items

**Main flow**

1. User opens check summary
2. System shows subtotal, tax, discounts, voids, total due
3. User confirms payment step

**Result**

- Clear bill presentation before closing

---

# 18. Take payment

**Actor:** Cashier
**Goal:** Collect payment for the check.

**Phase 1 payment types**

- cash
- card
- mixed if already simple to support

**Preconditions**

- Order is open
- Shift is active

**Main flow**

1. User selects payment type
2. Enters amount tendered
3. System records payment
4. System updates remaining due or marks fully paid
5. For cash, system calculates change if needed

**Result**

- Payment is captured and linked to sale

---

# 19. Close table

**Actor:** Cashier / Server
**Goal:** Finalize the sale and free the table.

**Preconditions**

- Order is fully paid

**Main flow**

1. User confirms close
2. System finalizes sale
3. Table session is closed
4. Table state returns to available
5. Final audit/event records are created

**Result**

- Check is immutable
- Table can be reused

---

# 20. Close shift / cash reconciliation

**Actor:** Cashier / Manager
**Goal:** End shift and reconcile cash drawer.

**Preconditions**

- Shift is active

**Main flow**

1. User starts shift close
2. System shows expected cash
3. Cashier enters counted cash
4. System calculates variance
5. User confirms close
6. Audit log stores closing details

**Result**

- Shift is closed with variance tracked

---

# 21. Offline order capture and sync

**Actor:** Cashier / Server
**Goal:** Continue working when network is unstable.

**Preconditions**

- POS device supports offline queue

**Main flow**

1. User performs actions while offline:
   - open table
   - add items
   - send commands into queue

2. System stores commands locally with idempotency keys
3. When connection returns, sync sends commands to backend
4. Backend applies them safely without duplication
5. Any conflict is surfaced explicitly

**Result**

- Restaurant can operate through connectivity issues

---

# 22. Audit and trace sensitive actions

**Actor:** Manager / Admin / System
**Goal:** Keep traceable history for financial and operational actions.

**Tracked actions**

- shift open/close
- table open/transfer/merge
- send to kitchen
- void request/approval
- discount request/approval
- payment and close

**Result**

- Compliance, support, and dispute handling are possible

---

# Best Phase 1 use-case set for implementation

If you want the tightest MVP, implement these first:

1. Open shift
2. View floor plan
3. Open table
4. Add items
5. Add modifiers
6. Send to kitchen
7. Update kitchen status
8. Request void / approve void
9. Request discount / approve discount
10. Take payment
11. Close table
12. Close shift
13. Offline sync

If you want, I can turn these into **formal use-case specs** with:

- ID
- actor
- trigger
- preconditions
- postconditions
- happy path
- alternate flows
- error flows

for direct use in your PRD or implementation docs.
