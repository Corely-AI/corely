# Prompt Inventory

This inventory lists prompt assets, where they live, how they are used, and their risk profile.

## Runtime prompts (centralized)

| Prompt ID                            | Location                                     | Purpose                                            | Owner module                         | Risk                           |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------- | ------------------------------------ | ------------------------------ |
| `copilot.system`                     | `packages/prompts/src/prompts/copilot.ts`    | System prompt for Corely Copilot chat              | `services/api` (ai-copilot)          | User-facing assistant behavior |
| `copilot.collect_inputs.description` | `packages/prompts/src/prompts/copilot.ts`    | Tool description for `collect_inputs` field typing | `services/api` (ai-copilot)          | Internal tool guidance         |
| `inventory.extract_product_proposal` | `packages/prompts/src/prompts/inventory.ts`  | Extract product proposal from text                 | `services/api` (inventory tools)     | Internal data extraction       |
| `inventory.extract_receipt_draft`    | `packages/prompts/src/prompts/inventory.ts`  | Extract receipt draft from text                    | `services/api` (inventory tools)     | Internal data extraction       |
| `inventory.extract_delivery_draft`   | `packages/prompts/src/prompts/inventory.ts`  | Extract delivery draft from text                   | `services/api` (inventory tools)     | Internal data extraction       |
| `inventory.suggest_reorder_policy`   | `packages/prompts/src/prompts/inventory.ts`  | Suggest reorder policy                             | `services/api` (inventory tools)     | Internal planning assistance   |
| `purchasing.extract_supplier`        | `packages/prompts/src/prompts/purchasing.ts` | Extract supplier details                           | `services/api` (purchasing tools)    | Internal data extraction       |
| `purchasing.extract_purchase_order`  | `packages/prompts/src/prompts/purchasing.ts` | Extract purchase order draft                       | `services/api` (purchasing tools)    | Internal data extraction       |
| `purchasing.extract_vendor_bill`     | `packages/prompts/src/prompts/purchasing.ts` | Extract vendor bill draft                          | `services/api` (purchasing tools)    | Internal data extraction       |
| `purchasing.categorize_bill_lines`   | `packages/prompts/src/prompts/purchasing.ts` | Suggest categories / GL accounts                   | `services/api` (purchasing tools)    | Internal classification        |
| `purchasing.draft_vendor_email`      | `packages/prompts/src/prompts/purchasing.ts` | Draft vendor email                                 | `services/api` (purchasing tools)    | User-facing comms              |
| `approvals.suggest_policy`           | `packages/prompts/src/prompts/approvals.ts`  | Suggest approval policy                            | `services/api` (approvals tools)     | Admin-facing policy config     |
| `crm.extract_party`                  | `packages/prompts/src/prompts/crm.ts`        | Extract party from text                            | `services/api` (CRM tools)           | Internal data extraction       |
| `crm.extract_deal`                   | `packages/prompts/src/prompts/crm.ts`        | Extract deal from text                             | `services/api` (CRM tools)           | Internal data extraction       |
| `crm.follow_up_suggestions`          | `packages/prompts/src/prompts/crm.ts`        | Suggest follow-up activities                       | `services/api` (CRM tools)           | User-facing suggestions        |
| `workflow.ai_task.freeform`          | `packages/prompts/src/prompts/workflows.ts`  | Generic workflow AI task wrapper                   | `services/worker` (workflow handler) | Internal automation            |

## Reference prompts (human-run)

These prompts are documentation-only task templates used by operators (not executed by runtime code). They remain in `docs/prompts/` and should be migrated into `packages/prompts` if they become runtime prompts.

- `docs/prompts/approvals.md`
- `docs/prompts/apps-templates-packs.md`
- `docs/prompts/engagement.md`
- `docs/prompts/error-handling.md`
- `docs/prompts/party-crm-refactor.md`
- `docs/prompts/refactor-di.md`
- `docs/prompts/role-permission-management.md`
- `docs/prompts/tokens-management.md`
- `docs/prompts/workflow.md`

## LLM entry points

- `services/api/src/modules/ai-copilot/infrastructure/model/ai-sdk.model-adapter.ts` (Copilot chat system prompt + tools)
- `services/api/src/modules/*/adapters/tools/*.tools.ts` (Inventory, Purchasing, Approvals, CRM `generateObject` calls)
- `services/worker/src/modules/workflows/handlers/ai-task.handler.ts` (workflow AI task handler)

## Context assembly

- Copilot chat: context from `CopilotController` includes `tenantId`, `userId`, `workspaceKind` (currently defaulted), `environment` via `EnvService.APP_ENV`.
- Tool prompts: use `tenantId` and environment (`EnvService.APP_ENV`), with tool-specific variables (e.g., `SOURCE_TEXT`).
- Workflow AI tasks: use `tenantId` + environment; prompt variables provided by task input.
