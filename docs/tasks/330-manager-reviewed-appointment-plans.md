# Review an operational plan

Related to [OPS-05 / #330](https://github.com/Corely-AI/corely/issues/330).
OpenBuk managers can start a plan from the schedule or an appointment row.
A plan can group an exact appointment replacement and completion of a
specific task. It shows the existing appointment, replacement slot and
timezone, or the task title, assignee and current version. The app creates
scoped approval records during preview. Booking, task state and customer
delivery are unchanged until a reviewed action is applied.

Open each action to approve or reject the exact details. A human decision
expires after 20 minutes. Applying an action rechecks current workspace
authority, the action version, and booking or task rules. Each action has
its own durable result and replay identity. If one action fails, recover
or re-propose it independently. Other actions retain their recorded status.
The plan page reloads current states when reopened.

Draft a booking confirmation for an upcoming confirmed appointment, or a
customer update after a reviewed move has applied. The exact recipient
and localized text are shown before approval. The manager may select a
specific reminder dispatch time. Notifications uses the confirmed Booking
state and enqueues the approved message for post-commit delivery. A provider
failure leaves Booking state intact and can be retried within the existing
window. Review links check current workspace access again.

A source-version change requires a new preview and human decision. Real
provider communications and the fully composed pilot package require
independent deployment and acceptance evidence.
