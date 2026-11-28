# Resumable pilot setup

[PLAT-04 / #304](https://github.com/Corely-AI/corely/issues/304) extends the existing
OpenBuk staff surface selected by the [pilot decision](../products/corely/pilot-booking-decision.md).
This is one location, one service and one bookable resource. Account membership does
not create an employee profile or link an account to that resource. Team self-service,
imports and pilot cutover acceptance remain in their owning tickets.

## Owner flow

Open `/app` or `/app/settings` in `apps/openbuk-web`. Enter the location name, country,
currency, booking language and IANA timezone. **Save draft** saves a private checkpoint;
service/staff names and working hours can remain incomplete. Return after a reload or
sign-in to resume the saved values. Unsaved edits are not autosaved. Invalid timezones,
including numeric UTC offsets, are rejected on both client and server.

First setup uses Workspaces' existing legal entity, workspace and owner membership.
Concurrent or interrupted starts recover the caller's one existing active workspace;
multiple existing workspaces require an explicit selection. The initial country and
currency live on the legal entity; Booking owns the studio name, locale and timezone.
No demo record is copied into a workspace. Marketing examples remain static and tests
use synthetic records in a separate disposable database.

**Save & publish booking page** validates complete service, resource and hours settings.
Booking configuration, Workspaces publication, audit and publication event persistence
share one transaction. Failure rolls everything back. Retrying retains the service and
resource IDs and does not repeat the publication transition event. An incomplete draft
has no public studio or slots. Saving a draft for an already published studio preserves
its current live settings until publication. Draft saves use the last successfully
saved checkpoint; simultaneous editor revisions have no merge/version UI.

Owner/admin workspace membership is required for drafts, configuration, publication
and invitation creation. Permission revalidation inside a state-changing transaction
uses that transaction's connection, so concurrent setup requests cannot exhaust the pool
by waiting for extra authorization connections. Publication permission is checked before the legacy workspace
response cache and again in the application layer. Ordinary members receive an explicit
access explanation in OpenBuk; hiding controls is not the backend access check.

## Invitations and identities

After the workspace is created, use **Invite staff** in setup/settings. Supply an email
address, create the invitation link and share it privately with that recipient. This
flow **does not send email or other messages**. Links expire after seven days while
pending; repeating creation for the same normalized email reuses its pending link.
The UI clears the previous link when the recipient field changes.

The recipient opens `/invite#<token>`, signs in with the invited email and explicitly
accepts. Existing users log in; a new user uses normal Identity signup, which retains
its existing account/tenant behavior. Do not sign up again for an existing account.
The invitation is retained in session storage only for the sign-in round trip, and is
removed after successful acceptance. A rejected invitation preserves the current workspace
selection; continuing without joining returns to it. The token stays in the URL fragment, outside the
HTTP request path and referrer. Do not paste links into logs or screenshots.

Workspaces validates the invitation and delegates account association to Identity's
public `AssociateInvitedAccountUseCase`, in the same transaction. It creates no user.
A missing tenant membership receives the existing `STAFF` system role; an existing
tenant role is retained. Workspace access is `MEMBER`, never owner/admin. Existing
active workspace memberships retain their roles. Concurrent/repeated acceptance
returns the same membership; wrong-account, expired, canceled, inactive-account,
deleted-workspace and disabled-member attempts fail. An accepted token cannot
recreate a deleted workspace or tenant membership. New pending invitations remain an
explicit owner-authorized association, rather than a general offboarding workflow.

Invitation secrets use the existing `WorkspaceInvite.token` field. They are returned
only through owner/admin creation or member-management views; ordinary members receive
no invitation list. No new notification consumer is registered. Existing sensitive
role changes, employee/resource association and offboarding retain their own workflows.

## API and ownership

| Endpoint                                            | Owner and behavior                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POST /workspaces/pilot-setup/start`                | Workspaces; recover/create first private workspace, atomic legal entity and owner membership.                |
| `GET /openbuk/setup` / `PUT /openbuk/setup`         | Booking; owner/admin private checkpoint in Booking-owned `ext.kv`, `workspace:<id>/openbuk-setup-draft`.     |
| `POST /openbuk/studio/publish`                      | Booking validates complete setup and calls Workspaces' public publication interface in the same transaction. |
| `POST /workspaces/:workspaceId/pilot-setup/invites` | Workspaces; member-only, manually shared invitations.                                                        |
| `POST /workspaces/pilot-setup/invites/accept`       | Workspaces + public Identity account association; authenticated matching recipient, safe replay.             |

Existing `PUT /openbuk/studio`, public OpenBuk routes and generic invitation wire schemas
are retained. Pilot invitation contracts/routes are additive and do not activate the
older administration screen's generic “send invite” flow. No new table, schema, app
framework or service is introduced. Setup requires neither AI nor finance activation.
The broader [access policy](./operational-access.md) and
[package gates](./operational-package.md) remain distinct controls.

## Verification and interface evidence

See the [task record](../tasks/304-resumable-pilot-setup.md) for exact commands, results,
failures and environment cleanup. The PostgreSQL suite covers transactional start,
draft isolation, timezone validation, service/resource identity reuse, publication
rollback, invitation races/replay, expiry, wrong-account attempts and revoked access.
The real API browser suite covers resumed setup, private/public availability, invitation
acceptance and member denial including owner-cache replay, plus the existing EN/DE/VI
guest-booking regression. No customer environment or real outbound provider is used.

Screenshots use synthetic test accounts and omit invitation tokens:

- [Private checkpoint, 390 × 844](./images/304-private-draft-mobile.png).
- [Settings and empty invitation form, 1440 × 1000](./images/304-settings-desktop.png).
- [Invitation form before link creation](./images/304-invite-form.png).
- [Member access explanation](./images/304-member-access.png).
- Rejected invitation preserving workspace context: [desktop](./images/304-invitation-rejected.png) and [phone](./images/304-invitation-rejected-mobile.png).

These checks do not establish customer adoption, production readiness, successful import,
notification delivery, People self-service or deployment.
