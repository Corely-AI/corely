# Staff availability and Booking

[PEOPLE-02 / #306](https://github.com/Corely-AI/corely/issues/306) adds working
patterns to the manager's staff detail at `/people/staff/:id`. Staff profiles can
have patterns without login accounts or Booking resources. This is availability
configuration. [Private absences](people-absences.md) separately own approved
absence intervals and restricted reasons/files; those intervals further constrain
the existing neutral windows. Neither slice implements payroll or an entitlement engine.

## Authoritative inputs

| Input                                                                                   | Owner and storage                                                                             | Collaboration                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Staff identity and optional resource link                                               | People staff profile, existing extension storage                                              | Booking receives only the linked resource's neutral availability windows                                                    |
| Staff recurring hours, IANA timezone, effective dates, dated exceptions                 | People, `ext.kv`, module `people`, actual tenant, `workspace:<id>:availability`, staff ID key | One versioned plan timeline per staff; never copied into Booking rules                                                      |
| Resource opening hours, blackouts, service duration, buffers, notice and advance limits | Existing Booking resource/rule/service and OpenBuk configuration owners                       | Public slot calculation intersects these with People windows                                                                |
| Approved absence intervals and private history                                          | People, existing extension storage; [absence owner](people-absences.md)                       | Subtract neutral absence intervals from pattern windows; private reasons/files never cross into Booking                     |
| Reservations, allocations and active holds                                              | Existing Booking repositories                                                                 | Booking checks occupancy; People reads IDs and allocation intervals through a public owner adapter to flag future conflicts |

People uses Booking's public existence, lock and commitment interfaces; it never
queries Booking tables. Booking uses People's public neutral constraint service;
it never queries People storage. No competing staff schedule store, new schema,
migration, worker or deployment is introduced.

An explicit linked staff profile with no pattern is unavailable. Archived linked
staff are unavailable. An unlinked legacy resource retains its existing Booking
behavior; linking does not copy its hours as an implicit staff pattern. Disabling
the People management app does not erase a previously configured constraint.

## Civil-time rules

- Weekdays are Sunday `0` through Saturday `6`. Ranges are half-open, with minute
  precision. End before start continues onto the next civil day. Equal endpoints
  are invalid; split full-day coverage into adjacent ranges.
- A dated exception replaces its **entire civil day**, including incoming
  overnight spill. An empty window list means closed. With no current-date
  exception, current weekly hours are combined with the prior date's overnight
  hours; a prior-date exception replaces that prior date's weekly carry.
- Only one exception per date is allowed. Overlapping weekly ranges (including
  the week boundary), overlapping exception ranges, invalid dates/timezones and
  equal/reversed effective-date boundaries are rejected. A next-date exception
  wins over overnight carry from either a weekly rule or a preceding exception.
- Evaluation walks real UTC instants and tests local wall time. DST gaps invent
  no availability; repeated times retain both real occurrences. First actual
  instants resolve civil effective-date boundaries, including midnight folds or
  gaps. A wholly skipped civil effective date is rejected.

## Effective dates and history

Start dates are inclusive; end dates are exclusive. Each published snapshot has
server-derived UTC boundaries and its own timezone. The most recently effective
snapshot wins at each instant. Expiry closes availability until a newer snapshot
begins; an older snapshot never becomes active again.

Past dates cannot be published. A change starting today begins at the next minute
boundary at or after the server clock; earlier effective snapshots remain intact.
A pending snapshot with the same civil start date is replaced even if its timezone
changes. Other pending dates remain scheduled. Managers can inspect published
patterns and use them as templates. The bounded extension record supports 256
effective snapshots, 56 weekly ranges and 366 exception dates per snapshot.
Availability queries for linked staff accept positive ranges up to 62 days;
commitments with more than 62 remaining days are conservatively flagged for review.

## Commands, authorization and impacts

`GET /people/staff/:id/availability` returns versioned patterns, profile version,
linked resource ID, evaluation timestamp and neutral conflicting commitment IDs/
intervals. `POST` accepts `{ version, profileVersion, pattern }` and the shared
idempotency header. Both require current workspace membership,
`people.directory.read`, `people.profile.manage` and the enabled People app.
Unknown scope selectors and private-reason fields are rejected. Ordinary staff
do not retrieve raw schedules or commitment IDs through this manager endpoint.
Booking's internal projection contains UTC windows only, with no personnel reasons.

Publication holds the existing People workspace transaction lock and Booking's
resource lock, rechecks authority and versions, and writes the pattern, neutral
audit entry, `people.availability.changed` outbox event and replay marker atomically.
Changed payloads cannot reuse a key. Replays reauthorize and return the current
view. Profile link/archive writes acquire the same resource locks.

Public OpenBuk slot search applies staff constraints to the entire service plus
buffers. Public confirmation rechecks after the resource lock. Generic Booking
allocation creation, hold creation and replacement allocations also recheck within
their existing resource-locked transactions, resolving actual resource workspace
ownership. Hold confirmation and consumption are atomic with booking creation:
a staff change rejecting confirmation leaves the hold active.

Each manager read and publication derives conflicts from Booking allocations and
unexpired active holds whose occupancy has not ended. This includes a future
appointment whose preparation buffer has already started and ongoing commitments.
Only the remaining interval at or after the evaluation clock is checked; elapsed
history and fully ended commitments do not produce conflicts. Publication records their
neutral IDs in its transactional audit/outbox metadata. Managers review them in
Booking; no booking is moved, cancelled or rewritten, and no private reason is
recorded. This is a live impact projection, not a second reservation store or an
automatic reassignment workflow. The existing generic availability endpoint's
stub slot generator is not expanded by this slice; authoritative OpenBuk search
and Booking writes are the covered integration paths.

Personnel DTOs remain `private, no-store` and in mounted UI memory. The editor pins
workspace context, aborts/discards stale loads, ignores late mutation callbacks,
preserves failed drafts, supports explicit reload and reuses the command key on
unchanged retries. Manual actions work without AI; EN/DE/VI copy is included.

See the [delivery record](../tasks/306-staff-availability.md) for fresh test results,
browser evidence and known repository check limitations.
