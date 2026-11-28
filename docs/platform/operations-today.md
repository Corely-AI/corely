# Operations Today

The manual Today page is available in the Backoffice workspace navigation
at `/today`. Its `GET /operations/today` endpoint uses the current tenant,
workspace and user. The workspace is authorized before querying any source.
The view has no action controls. Links open the owning Schedule, Tasks or
Requests flow, where current authorization still applies.

The Booking source provides the published studio time zone. UTC is shown
as the fallback when the configured zone is unavailable. The API computes
the civil date and half-open interval with Corely’s time utilities, including
short or long days around offset changes.

- Booking returns appointments starting in that local day, according to its
  existing studio manager authorization. Customer information and resource
  assignments are omitted from the response.
- Tasks returns authorized tasks due inside the same interval. Staff see their
  own tasks. Authorized managers see the wider workspace queue.
- Requests returns the requester’s returned items and current assigned
  reviewer work. Work still awaiting action carries forward across day boundaries.
  Reasons, names, notes and files stay in the Requests detail.
- People availability detects neutral schedule exceptions for confirmed
  appointments. Affected appointments are counted once, even when several
  allocations are unavailable. Unlinked legacy resources retain Booking rules.

Sources report their own observation time and exact available count. The UI
previews up to 25 items per source and links to the full owning app.
Restricted, disabled or failed sources omit counts. Partial results keep
known counts and disclose incompleteness. Each source read has a five-second
deadline, and a completed read older than 30 seconds at response time is
marked stale. Refresh recomputes the projection from the owners. It writes no
records, depends on no model, and can display useful work when a source fails.

The composition follows the neutral owner-read pattern in the earlier
[manager-reviewed appointment plan](https://github.com/Corely-AI/corely/tree/330-manager-reviewed-appointment-plans/services/api/src/modules/operations-brief)
without using the CLI. Delivery depends on [#303](https://github.com/Corely-AI/corely/issues/303),
[#311](https://github.com/Corely-AI/corely/issues/311),
[#313](https://github.com/Corely-AI/corely/issues/313) and
[#318](https://github.com/Corely-AI/corely/issues/318).
