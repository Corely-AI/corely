# AI-Native Approvals

Approvals are implemented on top of the workflow runtime. Policies are stored as
`WorkflowDefinition` records with `type=APPROVAL`, and approval requests are workflow
instances with human tasks as approval steps.

## Key Concepts

- **Approval policy**: a workflow definition with a key prefix `approval.`
- **Approval request**: a workflow instance created by `ApprovalGateService`
- **Approval task**: a `Task` with `type=HUMAN`, assigned to a user/role/permission

## API Endpoints

- `POST /approvals/policies` create a policy
- `GET /approvals/policies` list policies
- `GET /approvals/policies/:id` fetch a policy
- `POST /approvals/policies/:id/activate` activate
- `POST /approvals/policies/:id/deactivate` deactivate
- `GET /approvals/requests` list approval requests
- `GET /approvals/requests/:id` request details
- `GET /approvals/inbox` list pending approval tasks
- `POST /approvals/tasks/:taskId/decision` approve/reject

## Gate Usage

Domain modules should call `ApprovalGateService.requireApproval` with:

- `tenantId`, `userId`, `actionKey`
- `entityType`, `entityId`
- `payload` for rules evaluation
- `idempotencyKey`

If the policy rules do not match, the gate returns `APPROVED`. Otherwise it starts
an approval workflow and returns `PENDING` with the workflow instance id.

## Audit & Events

Actions emit:

- `AuditLog` entries (`approval.requested`, `approval.approve`, `approval.reject`)
- `DomainEvent` + `OutboxEvent` for notifications and downstream integrations
