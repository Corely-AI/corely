# Private Knowledge procedures

## Reading current procedures

The Knowledge page searches current publications in the active workspace. Search matches
published titles, page text and attachment names. It returns up to 100 summaries with the
owner, publication version, review date and overdue status. Review is overdue after the
recorded UTC calendar date. The management view is available through `/knowledge/manage`.

Links from operational work use `/knowledge/published/<procedure-id>`. A link follows the
current publication. It stores a procedure identifier and leaves publication text, titles
and version history with Knowledge. The reader and preview recheck workspace membership,
Knowledge access and the current publication. A draft, archived or deleted procedure has no
reader preview. A published attachment has its own reader download path with the same checks.

Search reads the workspace collection directly and returns no cached excerpts. Reader
responses use private no-store caching. The browser excludes Knowledge queries from offline
snapshots and removes older Knowledge entries when restoring a snapshot.

Knowledge is an authenticated Backoffice collection at `/knowledge`. Install
and enable the Knowledge app through Platform and grant `knowledge.read` to
workspace members who need the current published version. Grant
`knowledge.manage` as well for drafting, publishing and archiving.
The creator's account owns the procedure. Other workspace editors can maintain it
when an owner is unavailable.

Authors choose a plain-text page, HTTP(S) reference, or file of up to 2 MiB.
Every draft has a title and a review date. Publishing creates a versioned
snapshot. An edit after publication leaves the current version available to staff
until the next draft is published. Archive immediately hides the procedure and
its file from ordinary staff reads. Authors and readers see the review date
alongside the current version.

The Knowledge API uses authenticated tenant and workspace context on every read
and write. A file download checks the requested file against the visible snapshot
before serving bytes as an attachment. Documents owns file metadata and object
storage. The Knowledge document prefix restricts file lookup to the owning
procedure download. The browser opens external references directly.

Current state, immutable publication snapshots and replay records use extension
storage. Commands require an idempotency key. Editing, publishing and archiving
also require the revision the author reviewed. Audit records and publication
events commit with the procedure change. The feature uses the existing database
schemas.
