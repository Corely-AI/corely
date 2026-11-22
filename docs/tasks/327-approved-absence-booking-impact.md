# 327 Approved absence impact for appointment replacement

- Issue [#327](https://github.com/Corely-AI/corely/issues/327), parent [#288](https://github.com/Corely-AI/corely/issues/288).
- Branch `327-approved-absence-booking-impact` targets `318-reviewed-appointment-lifecycle` ([#480](https://github.com/Corely-AI/corely/pull/480), `5cc7e18a`). Retarget and recheck after #318's Booking slice integrates.
- Reuses People ownership of approved absences and the existing manager availability view. The Booking preview and apply path reads the authoritative impact directly. Adds no absence projection or background delivery. Request review and handoff are tracked in [#310](https://github.com/Corely-AI/corely/issues/310), and follow-up links in [#315](https://github.com/Corely-AI/corely/issues/315).
- The new preview requires current absence impact. Apply rechecks it under the shared resource lock. Preview contains only the booking facts and a neutral flag.

## Verification

- The new PostgreSQL case checks missing impact, approved impact, privacy and invalidation after cancellation. The booking remains at its original time.
- Backend-only changes. The existing manager availability view retains its booking exception presentation.
