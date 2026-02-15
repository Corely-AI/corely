# Implementation Plan - Phase 2 & 3: Engagement & Automation

This plan outlines the expansion of the CRM module to include robust engagement logging (Phase 2) and intelligent automation (Phase 3).

## Phase 2: Engagement Logging & Timeline

**Objective**: unified view of all customer interactions (Calls, Emails, Meetings) with specific details for each type.

### 1. Domain & Schema Updates
- **`Activity` Model Enhancements**:
  - Add `outcome` (String?): For call results (e.g., "Voicemail", "Connected", "No Answer").
  - Add `durationSeconds` (Int?): For calls and meetings.
  - Add `location` (String?): For meetings.
  - Add `attendees` (Json?): For meeting participants.
  - Add `metadata` (Json?): For flexible extensions (e.g. email headers, call recording URLs).

### 2. Contract Updates
- **`packages/contracts/src/crm/activity.types.ts`**:
  - Update `ActivityDto` to include new fields.
  - Update `CreateActivityInput` to support specific payloads for `CALL`, `MEETING`, `EMAIL`.

### 3. Backend Implementation
- **`PrismaActivityRepoAdapter`**: Map new fields to Prisma model.
- **Use Cases**:
  - `LogCallUseCase`: Specialized use case for calls.
  - `LogMeetingUseCase`: Specialized use case for meetings.
  - `LogEmailUseCase`: Specialized use case for emails (manual logging).
- **Timeline Aggregation**: Ensure `GetTimelineUseCase` returns rich details for each activity type.

### 4. Frontend Implementation
- **Activity Feed (`Timeline`)**:
  - Differentiate rendering for Calls, Meetings, Emails, and Notes.
  - Show "Call Outcome" and "Duration" badges.
- **Action Modals**:
  - **Log Call**: Duration slider, Outcome selector, Note.
  - **Log Meeting**: Date/Time picker, Location, Attendees.
  - **Log Email**: Subject, Body, To/CC (Manual logging for now).

---

## Phase 3: Automation & AI

**Objective**: Automate repetitive tasks using Sequences and leverage AI for content generation and decision support.

### 1. Domain & Schema Updates
- **`Sequence` Model**:
  - `name`, `ownerUserId`, `createdAt`.
- **`SequenceStep` Model**:
  - `sequenceId`, `stepOrder`, `type` (EMAIL_AUTO, EMAIL_MANUAL, CALL, TASK), `dayDelay`, `templateBody`, `templateSubject`.
- **`SequenceEnrollment` Model**:
  - `sequenceId`, `entityId` (Lead/Party), `currentStep`, `status`, `nextExecutionAt`.

### 2. Automation Engine (Worker)
- **`SequenceRunner`**:
  - Polls active enrollments due for execution.
  - **Auto Email**: Sends email via EmailService -> Logs `EMAIL` Activity -> Advances step.
  - **Manual Email**: Creates `EMAIL_DRAFT` Activity -> Advances step (upon approval).
  - **Task/Call**: Creates `TASK` Activity -> Advances step (upon completion).

### 3. AI Copilot Integration
- **Smart Drafting**:
  - `GenerateEmailDraftTool`: Uses LLM to draft email content based on Deal/Lead context and user prompt.
  - "Rewrite with AI" button in Email Modal.
- **Next Best Action**:
  - `RecommendNextStepTool`: Analyzes timeline to suggest: "Follow up in 3 days", "Enroll in 'New Lead' Sequence", or "Mark as Lost".
- **Enrichment**:
  - `ExtractContactInfoTool`: Parses email signature from raw text to update Contact details.

## Execution Order
1.  **Phase 2 Schema & Contracts** (Foundation).
2.  **Phase 2 Backend & UI** (Engagement features).
3.  **Phase 3 Schema & Worker** (Automation engine).
4.  **Phase 3 AI Tools** (Intelligence layer).
