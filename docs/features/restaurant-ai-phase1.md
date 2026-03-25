# Restaurant AI Phase 1

Restaurant POS Phase 1 uses the existing Corely `ai-copilot` stack. It does not introduce a second assistant runtime.

## Architecture

- Shared restaurant AI contracts live in `packages/contracts/src/restaurant-ai`.
- Restaurant prompts live in `packages/prompts/src/prompts/restaurant.ts`.
- Backend tool handlers live in `services/api/src/modules/restaurant/adapters/tools/restaurant.tools.ts`.
- Backend query orchestration for AI lives in `services/api/src/modules/restaurant/application/restaurant-ai.application.ts`.
- Tool execution still flows through `services/api/src/modules/ai-copilot`.

## Safety model

- AI only returns proposal cards and summaries.
- AI never mutates restaurant state silently.
- AI never finalizes sales, closes tables, approves voids, approves discounts, or posts inventory moves.
- Apply actions route back through the normal restaurant and POS commands.
- Existing audit, outbox, idempotency, and approval policies remain the source of truth.

## Phase 1 tool catalog

- `restaurant_searchMenuItems`
- `restaurant_buildOrderDraft`
- `restaurant_summarizeFloorPlanAttention`
- `restaurant_summarizeKitchenDelays`
- `restaurant_draftVoidRequest`
- `restaurant_draftDiscountRequest`
- `restaurant_summarizeManagerApprovals`
- `restaurant_summarizeShiftClose`

## UI surfaces

### POS

- Table order screen:
  - free-form order copilot panel
  - explicit apply for draft update, void request, discount request, and transfer proposal cards
- Floor screen:
  - quick AI attention summary
- Shift close screen:
  - quick AI variance and exception summary

### Web

- Restaurant copilot page for floor, kitchen, and approval summaries
- Entry points from floor plan and kitchen queue pages

## Offline behavior

- Manual POS flows remain offline-first.
- AI requires network availability.
- AI apply actions are online-only in Phase 1 where no restaurant-specific queued apply path exists yet.
- This does not block manual order entry or manual restaurant workflows.

## Known limitations

- Restaurant order drafting relies on the POS product snapshot being supplied from the client for priced menu proposals.
- Web Phase 1 focuses on operational summaries, not table-order apply.
- Accepted versus dismissed AI proposal telemetry is not yet persisted as a dedicated restaurant AI outcome record.
