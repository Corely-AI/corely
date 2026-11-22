# 318 Reviewed replacement for an OpenBuk appointment

- Issue [#318](https://github.com/Corely-AI/corely/issues/318), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `318-reviewed-appointment-lifecycle` targets `317-openbuk-scheduling-constraints` ([#479](https://github.com/Corely-AI/corely/pull/479), `9b7f50f7`). Retarget and recheck after it integrates.
- Supplies the deterministic Booking adapter needed by [#330](https://github.com/Corely-AI/corely/issues/330) and [#472](https://github.com/Corely-AI/corely/issues/472). It covers a future confirmed appointment in the existing single-staff studio. The broader day/week agenda, multi-resource editing and customer resolution remain under #318.

## Verification

- Contracts build and API typecheck passed.
- Eleven PostgreSQL-backed tests passed across the existing OpenBuk transaction suite and the reviewed replacement suite. The replacement suite covers manager and workspace checks, read-only preview, a competing public reservation, stale versions and a successful commit.
- No browser surface changes. The future human review surface belongs to the shared review workflow.
