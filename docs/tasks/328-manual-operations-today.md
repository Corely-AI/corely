# 328 manual Operations Today

[Issue #328](https://github.com/Corely-AI/corely/issues/328) shares the Work,
Requests, Booking and People owners in a read-only Backoffice workspace view.
See the [Today guide](../platform/operations-today.md) for source authority,
counts, time-zone rules and degraded states. The branch is stacked on
[#548](https://github.com/Corely-AI/corely/pull/548). The shell, task board and
appointment lifecycle dependencies must integrate before acceptance on
`development`.

Five projection tests covered the DST day, owner counts, rebuild behavior,
scope, privacy, partial delivery and a stalled source. Ten AppModule DI
tests passed. Scoped API and web builds and typechecks passed.

The built Backoffice passed two Chromium journeys with synthetic sources.
The desktop manager saw the four sources and followed a decision to a
current authorization check. Mobile staff saw permitted Tasks when other
sources were restricted, disabled, or temporarily unavailable.

- [Manager view, EN, 1280 × 900](328-assets/desktop-manager-today.png)
- [Reduced-motion loading, EN, 1280 × 900](328-assets/desktop-today-loading.png)
- [Staff view, DE, 390 × 844 viewport](328-assets/mobile-staff-today.png)
