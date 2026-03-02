# Auto-generated Prompt for CRM Resend Feature Implementation

```markdown
**System context:**
We are working on a Monorepo using NestJS, Prisma, and a Domain-Driven Design architecture. We have a `crm` module, `crm-mail` module, `workflow` module, and an `integrations` module.

**Objective:**
I want to implement a lead-to-won automated email sequence feature in our CRM using Resend.
The sequence logic is:

- Day 1: Send a welcome/introduction email to the customer with a demo website link (https://nails.corely.one/).
- Day 3: Send a follow-up email.
- Day 7 (1st week): Send a final follow-up email.
  All emails should be sent from `nails@corely.one`.

If the customer replies to any of these emails, the system should catch the reply, store the reply in our database as an activity, and automatically update the Deal's status.

**Technical Requirements & Steps to Implement:**

1. **Resend Integration:**
   - We currently have integrations for Gmail (`google-gmail`) and Microsoft Graph Mail, but we need to add support for Resend API keys.
   - Create a new package under `packages/integrations/resend` (similar to `google-gmail`).
   - Update `IntegrationsEmailProviderService` in `services/api/src/modules/integrations/infrastructure/providers/integrations-email-provider.service.ts` to support the Resend provider mapping and using the Resend API key instead of OAuth tokens.
   - Note: We already have a `ResendEmailSenderAdapter` in `packages/email/src/resend-email-sender.adapter.ts`. You can leverage this or implement a specific client in `packages/integrations/resend`.

2. **Automated Sequence Email Sending:**
   - In `services/api/src/modules/crm/application/use-cases/run-sequence-steps/run-sequence-steps.usecase.ts`, there is currently a `TODO: Actually send email` for the `EMAIL_AUTO` step type.
   - Implement the logic to actually send the email via our integration layer (or schedule it via `SendCommunicationUseCase`) when an automated email step is processed.
   - Ensure the From address is `nails@corely.one`.

3. **Handling Email Replies (Inbound Webhooks):**
   - Create a webhook endpoint to receive inbound emails from Resend (Resend provides a webhook for incoming emails).
   - Once a webhook is received, it should feed into `ProcessCommunicationWebhookUseCase` or a new dedicated handler.
   - The handler should:
     a) Register the inbound email as an `Activity` (type `COMMUNICATION`) in the database.
     b) Identify the associated `Deal` (perhaps by looking up the `externalThreadId`, original `Activity`, or `Lead`/`Deal` associated with the email address).
     c) Automatically change the Deal stage/status (e.g., to a "Replied" stage, or whatever intermediate stage is correct before WON).

4. **Sequence Creation:**
   - Provide a database seed or script (using `CreateSequenceUseCase`) that sets up this 3-step sequence:
     - Step 1: `dayDelay: 0`, `type: EMAIL_AUTO`, Subject/Body introducing nails.corely.one.
     - Step 2: `dayDelay: 3`, `type: EMAIL_AUTO`, Subject/Body following up.
     - Step 3: `dayDelay: 7`, `type: EMAIL_AUTO`, Subject/Body 1-week follow-up.

Please provide the implementation plan and the necessary code changes for the above requirements.
```
