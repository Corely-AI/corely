# @corely/prompts

Centralized prompt definitions and rendering utilities for Corely.

## Adding a prompt

1. Create a prompt definition in `src/prompts/<domain>.ts` with an explicit `id` and `defaultVersion`.
2. Use `variablesSchema` to validate inputs and `variables` to mark each placeholder as `text`, `block`, or `json`.
3. Add the definition to `src/prompts/index.ts` so the static provider can load it.

Example:

```ts
{
  id: "inventory.extract_product_proposal",
  description: "Extract a product proposal from unstructured text.",
  defaultVersion: "v1",
  versions: [
    {
      version: "v1",
      template: "Extract a product proposal from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
      variablesSchema: z.object({ SOURCE_TEXT: z.string().min(1) }),
      variables: [{ key: "SOURCE_TEXT", kind: "block" }],
    },
  ],
}
```

## Naming conventions

- Use dot-delimited IDs: `<domain>.<action>` (e.g., `crm.follow_up_suggestions`).
- Keep IDs stable across versions; add versions instead of editing templates in-place.

## Versioning rules

- Versions are immutable. Always add `v2`, `v3`, etc. for changes.
- Use `selection` rules to pin versions by environment/workspace/tenant.
- Avoid implicit “latest” in production.

## Rendering and safety

- Use `PromptRegistry.render` to validate variables and render templates.
- Block variables are wrapped with `<<VAR>>` / `<<END:VAR>>` delimiters.
- JSON variables are stable-stringified to preserve determinism.

## Logging prompt metadata

Every LLM call should log:

- `promptId`
- `promptVersion`
- `promptHash`

This metadata is required to reproduce runs.
