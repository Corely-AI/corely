import { createHash } from "crypto";
import {
  BaseUseCase,
  ConflictError,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
  RateLimitError,
  ExternalServiceError,
} from "@corely/kernel";
import type { DraftInvoiceIssueEmailInput, DraftInvoiceIssueEmailOutput } from "@corely/contracts";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { AiTextPort } from "@/shared/ai/ai-text.port";
import type { InvoiceCopilotRateLimitPort } from "../../ports/invoice-copilot-rate-limit.port";
import {
  buildInvoiceEmailDraftFacts,
  fallbackIssueBody,
  fallbackIssueSubject,
} from "../../services/copilot/invoice-email-draft.facts";
import {
  buildIssueEmailDraftPrompt,
  getMissingBankDetailsFallbackLine,
  parseEmailDraftOutput,
  sanitizeEmailDraftBody,
} from "../../services/copilot/invoice-email-draft.prompt-builder";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  aiText: AiTextPort;
  audit: AuditPort;
  rateLimit: InvoiceCopilotRateLimitPort;
};

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_DRAFTS = 20;

@RequireTenant()
export class DraftInvoiceEmailUseCase extends BaseUseCase<
  DraftInvoiceIssueEmailInput,
  DraftInvoiceIssueEmailOutput
> {
  constructor(private readonly depsRef: Deps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: DraftInvoiceIssueEmailInput,
    ctx: UseCaseContext
  ): Promise<Result<DraftInvoiceIssueEmailOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId ?? ctx.tenantId;
    if (!workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    if (!ctx.userId) {
      return err(new ValidationError("userId missing from context"));
    }

    const invoice = await this.depsRef.invoiceRepo.findById(workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    if (invoice.status !== "ISSUED" && invoice.status !== "SENT") {
      return err(new ConflictError("Invoice must be ISSUED or SENT to draft an issue email"));
    }

    const limitError = await this.checkRateLimit(ctx.tenantId, ctx.userId);
    if (limitError) {
      return err(limitError);
    }

    const facts = buildInvoiceEmailDraftFacts(invoice, input.language);
    const prompts = buildIssueEmailDraftPrompt({
      language: input.language,
      tone: input.tone,
      facts,
    });

    let generatedText = "";
    try {
      generatedText = await this.depsRef.aiText.generateText({
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
        temperature: 0.2,
        maxOutputTokens: 420,
      });
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        return err(error);
      }

      return err(
        new ExternalServiceError("Failed to draft invoice issue email", {
          reason: error instanceof Error ? error.message : String(error),
        })
      );
    }

    const parsed = parseEmailDraftOutput(generatedText);
    const subject =
      parsed.subject ||
      fallbackIssueSubject({ language: input.language, invoiceNumber: facts.invoiceNumber });

    let body = parsed.body;
    if (!body) {
      body = fallbackIssueBody({
        language: input.language,
        customerName: facts.customerName,
        invoiceNumber: facts.invoiceNumber,
        amountDueDisplay: facts.amountDueDisplay,
      });
    }

    body = sanitizeEmailDraftBody({
      body,
      hasBankDetails: facts.hasBankDetails,
    });

    if (!facts.hasBankDetails && !body.includes(getMissingBankDetailsFallbackLine())) {
      body = `${body}\n\n${getMissingBankDetailsFallbackLine()}`.trim();
    }

    await this.depsRef.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "invoice.copilot.email_drafted",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        type: "ISSUE",
        language: input.language,
        tone: input.tone,
        workspaceId,
        subjectHash: this.hashValue(subject),
        bodyHash: this.hashValue(body),
      },
    });

    return ok({ subject, body });
  }

  private async checkRateLimit(tenantId: string, userId: string): Promise<RateLimitError | null> {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000);
    const count = await this.depsRef.rateLimit.countDraftsSince({
      tenantId,
      userId,
      since,
    });

    if (count >= RATE_LIMIT_MAX_DRAFTS) {
      return new RateLimitError("Too many copilot draft requests. Please try again shortly.", {
        limit: RATE_LIMIT_MAX_DRAFTS,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
      });
    }

    return null;
  }

  private hashValue(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
