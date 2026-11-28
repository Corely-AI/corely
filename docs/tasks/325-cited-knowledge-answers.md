# 325. Cited Knowledge answers

## Tracking and outcome

[Issue #325](https://github.com/Corely-AI/corely/issues/325) belongs to [Knowledge #287](https://github.com/Corely-AI/corely/issues/287).
Branch `325-cited-knowledge-answers` targets the [published reader #547](https://github.com/Corely-AI/corely/pull/547)
at `ffa2c9457d03b09fec20b76b98cf4e84d1e31f97`. It uses the same authenticated
operational approach as [Copilot #542](https://github.com/Corely-AI/corely/pull/542).

## Reuse

- The existing Knowledge owner supplies current published passages to the existing Copilot
  text provider and rechecks access before returning selected passages.
- The provider receives at most 12 candidates with local ordinal IDs. The client receives at
  most three verbatim citations with source version and review status. The server builds
  the output from Knowledge records and rejects unsupported or malformed selections.
- Page text is treated as quoted data. The request exposes no tool calls or persisted
  conversation. The manual reader continues to handle existing procedure files and links.

## Verification

Six fixed-fixture answer tests cover grounding, abstention, prompt-injection input, revoked
permissions and versions, workspace selectors, and provider failures. Three migrated
PostgreSQL Knowledge tests cover scope and publication rules, including the passage reader.

## UI/UX evidence

Chromium exercised the actual Backoffice page with synthetic API responses. A staff
member submitted by keyboard and opened the cited source. The mobile browser checked
insufficient evidence, a changed source and the manual search fallback when disabled.

- [Cited answer, English desktop 1440 × 960](./evidence/325/desktop-cited-answer.png)
- [Insufficient evidence, German mobile 390 × 844](./evidence/325/mobile-insufficient.png)
- [Assistant disabled, English mobile 390 × 844](./evidence/325/mobile-disabled.png)

The evaluation uses an in-process text provider. A live provider was not called.
