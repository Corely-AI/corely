# Operational requests

Requests provides the private requester workflow at `/requests` in Backoffice. Enable the
Requests and People apps for the tenant. Grant staff `requests.read` and
`requests.own.submit` and connect each requester to an active staff profile in the
current workspace. Use an active workspace membership for every request operation.

- **Absence:** Inclusive first and last dates and a reason.
- **Equipment:** Item, quantity and justification. No Assets app setup is required.
- **General:** Subject and details.

Staff can save incomplete drafts. Submission validates all required fields, the
linked staff profile and access to referenced policy documents. Once submitted,
the contents and attachments are read-only. Withdrawal records a new lifecycle
transition and preserves the original submission and its date.

## Reviewer routing

An administrator with `requests.routing.manage` opens **Reviewer routing** and
selects a current workspace member with `requests.review` for each template.
Requests stores the selected version of the existing Approvals policy in its
workspace scope. Approvals uses a single, named reviewer for these policies.
Requests checks membership and permission again at submission and denies
self-routing. A missing or ineligible reviewer leaves the existing draft available.

## Decisions and People handoff

The assigned reviewer can open the submitted request and approve, reject or
return the current version. Rejection and return require a message for the
requester. Returned requests retain the entire decision history and can be edited
privately and resubmitted. Permissions and the selected reviewer are rechecked for
each command.

An approved absence remains pending until the reviewer applies it with a valid
time zone. People revalidates permissions, the staff profile link and date range.
The approved absence and Requests application result are committed together.
A failed application is visible and retryable. Approval of equipment or a
general request records the decision without creating an asset or payment.
The review inbox and reminders are covered by [#311](https://github.com/Corely-AI/corely/issues/311).

## Supporting documents and state

A saved draft accepts up to five private PDF, PNG or JPEG attachments, each up to
2 MB. Documents owns attachment storage and file metadata. Request-specific
downloads check request ownership, the current tenant and workspace, and the exact
attachment relation before returning a link valid for two minutes. The generic
document and public-file paths conceal these attachments. Use a document's existing
ID for an optional policy reference. That reference requires the existing
`documents.read` permission and a ready document the Documents owner returns in the
tenant. An unavailable document ID is omitted from subsequent responses.

Requests stores records and command replay results in extension storage keyed by
tenant and workspace. Mutations require a valid idempotency key and edits,
attachments, submission and withdrawal require the current record version.
Replaying a successful command returns the recorded result subject to current
read permissions. Mismatched keys and stale versions are rejected. Audit entries and
submission or withdrawal events share the transaction and carry request IDs and
versions without free-text reasons or attachment names. The browser keeps request
queries out of the persisted offline cache.

## Decision inbox and reminders

The requester list and reviewer inbox expose request type, status, age and
the relevant date. Counts cover the authorized queue before filtering and
pagination. Pending, failed and applied absence handoffs have distinct
statuses. Private reasons, requester names, notes and attachments stay
behind the authorized request detail.

The reviewer inbox at `/requests/inbox` contains current assigned reviews
and approved absences awaiting application or retry. It checks current
workspace permissions and the selected Approvals definition. Unavailable
approval definitions are excluded from the counts and reported in the
inbox. OpenBuk hands off to the Backoffice owner route when the operational
shell recognizes the `decisions` experience and both Requests permissions
are available.

Submission schedules one reminder for its exact version after 24 hours
through the existing outbox. The background handler rechecks that the
request is still submitted and that the assigned reviewer still has access.
It publishes a neutral in-app notification under the same lock as review
decisions. Notifications deduplicate by tenant, workspace, request and
submission version. A decision, withdrawal, revocation or replacement
version cancels the queued delivery. A fresh resubmission can schedule a
new reminder.
