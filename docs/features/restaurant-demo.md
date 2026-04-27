# Demo business

**Restaurant name:** Pho Saigon Mitte
**Type:** Vietnamese casual dining
**Location:** Berlin, Mitte
**Concept:** lunch + dinner, dine-in + takeaway
**Seats:** 32
**Staff on shift:**

- 1 cashier
- 2 servers
- 2 kitchen staff
- 1 manager

## Demo menu

Use a small, realistic menu:

**Starters**

- Fresh Spring Rolls
- Crispy Nem Rolls

**Main dishes**

- Pho Bo
- Pho Ga
- Bun Cha
- Bun Bo Nam Bo
- Com Rang Ga

**Drinks**

- Vietnamese Iced Coffee
- Jasmine Tea
- Homemade Lemon Soda

**Modifiers**

- no coriander
- extra chili
- extra beef
- no onion
- gluten-free note
- large portion

---

# Demo story

It is **Friday evening at 19:10**.

Pho Saigon Mitte is busy:

- Table 2: two guests already seated
- Table 5: four guests just arrived
- Table 7: takeaway pickup in progress
- Kitchen has three active tickets
- One cashier opened the shift with cash float
- Manager is on-site for approvals

This lets you show:

- floor plan
- table service
- modifiers
- kitchen flow
- manager approval
- payment
- shift close
- AI copilot

---

# Main demo scenario

## Scene 1 — Open shift

**Actor:** Cashier

Flow:

1. Cashier logs into `pos.corely.one`
2. Opens shift
3. Enters opening cash: **€200**
4. POS shows register active

What to say:

> “The restaurant starts the evening shift. Every transaction is tied to an active shift and register.”

---

## Scene 2 — Floor plan overview

**Actor:** Server

Show dining room:

- Table 2 = occupied
- Table 5 = available
- Table 7 = takeaway / pickup
- Table 8 = available

What to say:

> “The floor plan gives staff instant visibility into table status and service flow.”

---

## Scene 3 — Open a table

**Actor:** Server

At **Table 5**, 4 guests sit down.

Flow:

1. Server taps Table 5
2. Opens table session
3. Assigns guest count: 4
4. Starts draft check

What to say:

> “Opening a table creates a live service session and draft order linked to that table.”

---

## Scene 4 — AI-native order entry

**Actor:** Server using copilot

Server speaks/types:

> “Table 5: 2 pho bo, one no onion extra chili, 1 bun cha, 1 jasmine tea, 1 iced coffee.”

AI Copilot returns structured proposal:

- 2 × Pho Bo
  - item 1: no onion, extra chili

- 1 × Bun Cha
- 1 × Jasmine Tea
- 1 × Vietnamese Iced Coffee

Server taps **Apply**.

What to say:

> “AI does not change the order directly. It proposes a structured action card, and staff confirms it.”

This is a perfect showcase for AI-native POS.

---

## Scene 5 — Modifier clarification

Server adds:

> “One pho bo large, no coriander.”

AI asks for clarification only if needed, then proposes:

- update Pho Bo
- size: large
- remove coriander

What to say:

> “The copilot resolves natural language into menu items and modifiers, but keeps the cashier in control.”

---

# Local demo bootstrap

Use the built-in seed plus the localhost POS proxy:

```bash
pnpm dev:api
pnpm dev:web
pnpm --filter @corely/api seed:restaurant-demo
```

Then open `http://pos.localhost:8080/auth/login` and sign in with:

```txt
email: demo.restaurant@corely.one
password: Password123!
```

These defaults come from:

```txt
CORELY_RESTAURANT_DEMO_EMAIL=demo.restaurant@corely.one
CORELY_RESTAURANT_DEMO_PASSWORD=Password123!
```

Seeded employee users:

```txt
shared password for all users: Password123!

manager / owner
- demo.restaurant@corely.one

cashier
- cashier.linh@corely.one

servers
- server.minh@corely.one
- server.lan@corely.one

kitchen staff
- kitchen.tuan@corely.one
- kitchen.huong@corely.one

manager
- manager.ha@corely.one
```

Notes:

- `pos.localhost` stays the only local POS host
- the web dev proxy injects `x-corely-proxy-key` and `x-corely-surface: pos` on `/api/*`
- the API still trusts only the proxy key, never browser `Origin` or browser-sent surface/vertical headers

---

## Scene 6 — Send to kitchen

**Actor:** Server

Flow:

1. Review order
2. Tap **Send to Kitchen**
3. Kitchen ticket created
4. Kitchen display shows:
   - Pho Bo ×2
   - Bun Cha ×1
   - modifiers visible

What to say:

> “Once sent, the kitchen gets a clean ticket with modifiers and notes. Retry-safe sync prevents duplicate tickets.”

---

## Scene 7 — Kitchen status

**Actor:** Kitchen staff

Flow:

1. Kitchen marks ticket as **In Progress**
2. Then marks drinks ready
3. Later bumps mains as done

What to say:

> “Front of house can see whether the table is waiting, in progress, or ready.”

---

## Scene 8 — Mid-service change

One guest at Table 5 changes mind:

- cancel jasmine tea
- add homemade lemon soda

Flow:

1. Server opens order
2. Removes tea
3. Adds lemon soda

Optional AI input:

> “Replace jasmine tea with homemade lemon soda.”

AI proposes change, server applies.

---

## Scene 9 — Discount approval

A guest complains one pho arrived late. Server wants to apply **10% goodwill discount**.

Flow:

1. Server requests discount
2. Enters reason: “late dish”
3. Manager gets approval request
4. Manager approves on web or POS
5. Bill recalculates

What to say:

> “Discounts are controlled. Staff can request them, but manager approval is required and fully audited.”

---

## Scene 10 — Payment

Guests want to pay:

- €40 by card
- rest by cash

Flow:

1. Open payment screen
2. Apply approved discount
3. Record split payment
4. Show remaining due
5. Complete payment
6. Close table

What to say:

> “The sale is finalized only after payment is confirmed. The table then becomes available again.”

---

## Scene 11 — AI bill summary

Before payment, server asks copilot:

> “Summarize this bill.”

AI responds with:

- items ordered
- modifiers
- discount applied
- total due
- split payment recommendation

What to say:

> “AI can explain the bill, but it cannot take payment or close the table itself.”

---

## Scene 12 — Shift close

**Actor:** Cashier

End of shift:

1. Cashier opens shift close
2. System shows expected cash
3. Cashier counts drawer
4. Enters counted cash
5. Variance shown
6. Shift closed

Optional AI summary:

> “Summarize this shift and anomalies.”

AI returns:

- total covers
- top dishes sold
- discounts count
- void count
- cash variance summary

---

# Why this demo works

This scenario shows almost everything important in one story:

- restaurant-native workflow
- AI-native order capture
- modifiers
- kitchen tickets
- approvals
- payments
- auditability
- shift management

It also feels realistic for Berlin:

- casual Vietnamese concept
- mixed dine-in + takeaway
- multilingual staff possible
- quick-service dinner rush

---

# Optional Berlin flavor

You can localize the demo a bit more with:

- VAT/tax wording for Germany
- EUR currency
- German + English UI copy
- staff names like:
  - Linh (server)
  - Minh (cashier)
  - Bao (manager)

Example restaurant tagline:
**Pho Saigon Mitte — Vietnamese kitchen in Berlin**

---

# Best 5-minute demo script

1. Open shift
2. Show floor plan
3. Open Table 5
4. Use AI to enter order in natural language
5. Apply modifiers
6. Send to kitchen
7. Show kitchen progressing ticket
8. Request manager discount
9. Split payment
10. Close table
11. Show AI shift summary

If you want, I can turn this into a **full live demo script with exact sample prompts, expected AI outputs, and UI screens step by step**.
