# Prompt Management

## Why centralize prompts

- **Reproducibility**: prompt ID + version + hash allow deterministic run replay.
- **Safety**: untrusted inputs are rendered with explicit delimiters, reducing prompt injection risk.
- **Governance**: versioned prompts make changes reviewable and auditable.
- **Reuse**: shared prompts reduce drift across bounded contexts.
- **Compliance**: consistent logging of prompt metadata supports audit trails.

## Where prompts live

All runtime prompts live in `packages/prompts` and are versioned. Frontend code never embeds prompt text; it only sends user input and structured data to the backend.

## Public API (packages/prompts)

- `PromptDefinition`
  - `id`, `description`, `tags`
  - `versions`: template + variable schema per version
  - `defaultVersion`: explicit fallback
  - `selection`: environment/workspace/tenant-based version rules
- `PromptRegistry`
  - `get(id, context)` → definition + resolved version + hash
  - `render(id, context, vars)` → rendered prompt + metadata
- `PromptProviderPort`
  - Pluggable source of prompt definitions (static, overrides, remote)

## Providers/adapters

- **StaticPromptProvider**: loads prompts from `packages/prompts/src/prompts`.
- **Tenant overrides (design)**: override provider is supported by the registry interface. A minimal in-memory override provider exists; replace it with a DB-backed provider when needed.
- **Future remote provider**: implement `PromptProviderPort` to load prompts from Langfuse or another system without refactoring use cases.

## Versioning policy

- Versions are immutable; changes create `v2`, `v3`, etc.
- Production must always resolve to an explicit version (no implicit “latest”).
- Selection rules can target `environment`, `workspaceKind`, or `tenantId`.

## Security

- Variables are validated with `zod` before rendering.
- Text variables are normalized; block variables are wrapped with `<<VAR>>` / `<<END:VAR>>` delimiters.
- JSON variables are stable-stringified to ensure deterministic output.
- User-provided content never gets concatenated directly into instruction text.

## Observability contract

- Every LLM call logs `{promptId, promptVersion, promptHash}`.
- Copilot runs also log tenant/user/run metadata through observability spans.
- Prompt metadata should be included in any downstream run logs or audits.

## Guardrails

- `scripts/check-prompts.mjs` fails CI when inline prompt literals are added outside `packages/prompts`.
- Use `pnpm prompt:check` locally, or rely on `pnpm check` in CI.

## Migration summary

- Inline prompts in tool adapters and the copilot system prompt were replaced with registry renders.
- Prompt text was removed from the frontend.
- The workflow AI task handler now uses prompt IDs (with a backward-compatible freeform wrapper).

## Next steps

- Add a DB-backed tenant override provider when a governance UI exists.
- Migrate `docs/prompts/*` into prompt definitions if they become runtime prompts.
