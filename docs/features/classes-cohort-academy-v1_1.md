# Classes Cohort Academy v1.1

## Scope

`classes` is extended to support cohort-based language academy operations:

- Program templates ("Combos") with session/milestone templates
- Cohort lifecycle and cohort metadata (kind, lifecycle, timezone, capacity, delivery mode)
- Instructor team assignment per cohort
- Placement funnel (`APPLIED -> ENROLLED`)
- Enrollment billing plans (upfront/installments/invoice-net) and invoice generation
- Outcomes tracking (milestones + per-enrollment completions)
- Cohort resources (recordings/docs/links) with sortable "lifetime resources"

## Non-goals

- Replacing existing monthly billing run flows
- Deep CRM/Billing table joins from `classes` (module boundaries remain strict)
- Learner portal authorization policy changes (admin-facing support is delivered here)

## New Entities And Lifecycles

### Cohort lifecycle

Allowed transitions:

- `DRAFT -> PUBLISHED -> RUNNING -> ENDED -> ARCHIVED`
- `PUBLISHED -> ARCHIVED`
- `ENDED -> ARCHIVED`

### Enrollment status lifecycle

Allowed transitions:

- `APPLIED -> ENROLLED`
- `ENROLLED -> DEFERRED | DROPPED | COMPLETED`
- `DEFERRED -> ENROLLED`

### Added/extended models

- Extended `ClassGroup` (cohort metadata + `programId`)
- `ClassProgram`
- `ClassProgramSessionTemplate`
- `ClassProgramMilestoneTemplate`
- `ClassGroupInstructor`
- Extended `ClassEnrollment` (placement, payer, pricing snapshot, status/seat/source)
- `ClassEnrollmentBillingPlan`
- Extended `ClassBillingInvoiceLink` (`purpose`, `enrollmentId`)
- `ClassMilestone`
- `ClassMilestoneCompletion`
- Extended `ClassSession` (`type`, meeting provider metadata)
- `ClassGroupResource`

## Endpoints

### Programs

- `GET /classes/programs`
- `POST /classes/programs`
- `GET /classes/programs/:id`
- `PATCH /classes/programs/:id`
- `POST /classes/programs/:id/create-cohort`

### Cohorts

- `GET /classes/class-groups` (supports `kind`, `lifecycle`)
- `PATCH /classes/class-groups/:id`
- `POST /classes/class-groups/:id/lifecycle`
- `GET /classes/class-groups/:id/team`
- `PUT /classes/class-groups/:id/team`

### Applications/Enrollments

- `POST /classes/class-groups/:id/applications`
- `POST /classes/enrollments/:id/approve`
- `GET /classes/enrollments`
- `PATCH /classes/enrollments/:id`

### Billing Plans

- `GET /classes/enrollments/:id/billing-plan`
- `PUT /classes/enrollments/:id/billing-plan`
- `POST /classes/enrollments/:id/billing-plan/generate-invoices`

### Outcomes

- `GET /classes/class-groups/:id/milestones`
- `POST /classes/class-groups/:id/milestones`
- `PATCH /classes/milestones/:id`
- `DELETE /classes/milestones/:id`
- `PUT /classes/milestones/:id/completions/:enrollmentId`
- `GET /classes/class-groups/:id/outcomes-summary`

### Resources

- `GET /classes/class-groups/:id/resources`
- `POST /classes/class-groups/:id/resources`
- `PATCH /classes/resources/:id`
- `DELETE /classes/resources/:id`
- `PUT /classes/class-groups/:id/resources/reorder`

## Outbox Events

- `classes.cohort.published`
- `classes.cohort.started`
- `classes.cohort.ended`
- `classes.cohort.team_updated`
- `classes.enrollment.applied`
- `classes.enrollment.approved`
- `classes.enrollment.updated`
- `classes.enrollment.billing_plan_updated`
- `classes.invoice.generated`
- `classes.milestone.created`
- `classes.milestone.updated`
- `classes.milestone.deleted`
- `classes.milestone.completion_updated`
- `classes.resource.created`
- `classes.resource.updated`
- `classes.resource.deleted`

## DEUTSCH LIEBE Mapping

- Combo packages (`25/34/29`) map to `ClassProgram.expectedSessionsCount`
- Fixed cohort runs map to `ClassGroup` lifecycle, timezone, delivery mode, and sessions
- Placement consult flow maps to `CreateApplication` and `ApproveApplication`
- Discount labels and snapshots map to enrollment pricing fields
- Mentor team maps to `ClassGroupInstructor` roles (`INSTRUCTOR`, `MENTOR`, `TA`)
- Checkpoints and outcomes map to milestones/completions
- Lifetime recordings/materials map to `ClassGroupResource` with enrolled-only visibility
