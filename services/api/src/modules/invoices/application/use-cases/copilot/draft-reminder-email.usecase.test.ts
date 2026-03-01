import { beforeEach, describe, expect, it } from "vitest";
import {
  FixedClock,
  NoopLogger,
  isErr,
  type Result,
  type UseCaseError,
  unwrap,
} from "@corely/kernel";
import type {
  DraftInvoiceReminderEmailInput,
  DraftInvoiceReminderEmailOutput,
} from "@corely/contracts";
import type { PromptRegistry } from "@corely/prompts";
import type { EnvService } from "@corely/config";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { AiTextPort, AiTextRequest } from "@/shared/ai/ai-text.port";
import { DraftReminderEmailUseCase } from "./draft-reminder-email.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import type { InvoiceCopilotRateLimitPort } from "../../ports/invoice-copilot-rate-limit.port";

class FakeAudit implements AuditPort {
  entries: Array<{
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }> = [];

  async log(entry: {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.entries.push(entry);
  }
}

class FakeAiTextPort implements AiTextPort {
  constructor(
    private readonly generator: (request: AiTextRequest) => Promise<string> | string = async () =>
      "Subject: Reminder\n\nPlease pay."
  ) {}

  requests: AiTextRequest[] = [];

  async generateText(request: AiTextRequest): Promise<string> {
    this.requests.push(request);
    return this.generator(request);
  }
}

class FakeRateLimitPort implements InvoiceCopilotRateLimitPort {
  count = 0;

  async countDraftsSince(): Promise<number> {
    return this.count;
  }
}

const setupUseCase = (args?: {
  ai?: FakeAiTextPort;
  rateLimit?: FakeRateLimitPort;
  repo?: FakeInvoiceRepository;
}) => {
  const repo = args?.repo ?? new FakeInvoiceRepository();
  const ai = args?.ai ?? new FakeAiTextPort();
  const rateLimit = args?.rateLimit ?? new FakeRateLimitPort();
  const audit = new FakeAudit();

  const promptRegistry = {
    render: (promptId: string, _context: unknown, variables: Record<string, unknown>) => {
      if (promptId.endsWith(".system")) {
        const language = String(variables.LANGUAGE ?? "en");
        const languageLabel =
          language === "de" ? "German" : language === "vi" ? "Vietnamese" : "English";
        return {
          content: `Language: ${languageLabel}\nTone: ${String(variables.TONE ?? "normal")}`,
        };
      }

      return {
        content: String(variables.FACTS_JSON ?? ""),
      };
    },
  } as unknown as PromptRegistry;

  const useCase = new DraftReminderEmailUseCase({
    logger: new NoopLogger(),
    invoiceRepo: repo,
    aiText: ai,
    audit,
    rateLimit,
    promptRegistry,
    env: { APP_ENV: "test" } as EnvService,
  });

  return { useCase, repo, ai, audit, rateLimit };
};

const executeReminder = async (
  useCase: DraftReminderEmailUseCase,
  input: Partial<DraftInvoiceReminderEmailInput>,
  ctx?: { tenantId?: string; workspaceId?: string; userId?: string }
): Promise<Result<DraftInvoiceReminderEmailOutput, UseCaseError>> => {
  return useCase.execute(
    {
      invoiceId: input.invoiceId ?? "inv-1",
      language: input.language ?? "en",
      tone: input.tone ?? "normal",
    },
    {
      tenantId: ctx?.tenantId ?? "tenant-1",
      workspaceId: ctx?.workspaceId ?? "tenant-1",
      userId: ctx?.userId ?? "user-1",
    }
  );
};

const createSentInvoice = (args?: {
  id?: string;
  tenantId?: string;
  totalCents?: number;
  paidCents?: number;
}) => {
  const now = new FixedClock(new Date("2026-02-11T08:00:00.000Z")).now();
  const totalCents = args?.totalCents ?? 10_000;
  const paidCents = args?.paidCents ?? 0;

  const invoice = InvoiceAggregate.createDraft({
    id: args?.id ?? "inv-1",
    tenantId: args?.tenantId ?? "tenant-1",
    customerPartyId: "cust-1",
    currency: "EUR",
    lineItems: [{ id: "line-1", description: "Lesson", qty: 1, unitPriceCents: totalCents }],
    createdAt: now,
  });

  invoice.finalize("INV-001", now, now, { name: "Trang Nguyen", email: "trang@example.com" });
  invoice.markSent(now, now);

  if (paidCents > 0) {
    invoice.recordPayment(
      {
        id: "pay-1",
        amountCents: paidCents,
        paidAt: now,
        note: "Paid",
      },
      now
    );
  }

  return invoice;
};

describe("DraftReminderEmailUseCase", () => {
  it("rejects reminder draft when invoice is not ISSUED/SENT", async () => {
    const { useCase, repo } = setupUseCase();

    const draftInvoice = InvoiceAggregate.createDraft({
      id: "inv-draft",
      tenantId: "tenant-1",
      customerPartyId: "cust-1",
      currency: "EUR",
      lineItems: [{ id: "line-1", description: "Draft", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date("2026-02-11T08:00:00.000Z"),
    });

    repo.invoices = [draftInvoice];

    const result = await executeReminder(useCase, { invoiceId: "inv-draft" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toContain("ISSUED or SENT");
    }
  });

  it("rejects reminder draft when amountDueCents is zero", async () => {
    const { useCase, repo } = setupUseCase();
    const invoice = createSentInvoice({ id: "inv-paid", totalCents: 0, paidCents: 0 });
    repo.invoices = [invoice];

    const result = await executeReminder(useCase, { invoiceId: "inv-paid" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toContain("amount due is zero");
    }
  });

  it("uses fallback line when bank data is missing and removes fake IBAN/BIC lines", async () => {
    const ai = new FakeAiTextPort(async () => {
      return [
        "Subject: Payment reminder INV-001",
        "",
        "Please transfer to IBAN DE99999999999999999999.",
        "BIC: GENODEFF.",
      ].join("\n");
    });
    const { useCase, repo } = setupUseCase({ ai });
    repo.invoices = [createSentInvoice({ id: "inv-safe" })];

    const result = await executeReminder(useCase, { invoiceId: "inv-safe", language: "en" });
    const output = unwrap(result);

    expect(output.body).toContain("Please pay using the bank details shown on the invoice.");
    expect(output.body).not.toMatch(/iban/i);
    expect(output.body).not.toMatch(/\bbic\b/i);
  });

  it("changes output language based on language input", async () => {
    const ai = new FakeAiTextPort(async (request) => {
      if (request.systemPrompt.includes("German")) {
        return "Subject: Zahlungserinnerung\n\nBitte zahlen Sie den offenen Betrag.";
      }
      if (request.systemPrompt.includes("Vietnamese")) {
        return "Subject: Nhac thanh toan\n\nVui long thanh toan so tien con no.";
      }
      return "Subject: Payment reminder\n\nPlease pay the outstanding amount.";
    });

    const { useCase, repo } = setupUseCase({ ai });
    repo.invoices = [createSentInvoice({ id: "inv-lang" })];

    const deResult = unwrap(
      await executeReminder(useCase, { invoiceId: "inv-lang", language: "de", tone: "polite" })
    );
    const viResult = unwrap(
      await executeReminder(useCase, { invoiceId: "inv-lang", language: "vi", tone: "normal" })
    );

    expect(deResult.subject).toMatch(/Zahlungserinnerung/i);
    expect(deResult.body).toMatch(/Bitte zahlen/i);
    expect(viResult.subject).toMatch(/Nhac thanh toan/i);
    expect(viResult.body).toMatch(/Vui long thanh toan/i);
  });

  it("enforces workspace scoping (cannot draft invoice from another workspace)", async () => {
    const { useCase, repo } = setupUseCase();
    repo.invoices = [createSentInvoice({ id: "inv-scope", tenantId: "workspace-a" })];

    const result = await executeReminder(
      useCase,
      { invoiceId: "inv-scope" },
      { tenantId: "tenant-1", workspaceId: "workspace-b", userId: "user-1" }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("uses amountDueCents from canonical invoice totals in the prompt", async () => {
    const ai = new FakeAiTextPort(async () => "Subject: Payment reminder\n\nPlease pay.");
    const { useCase, repo } = setupUseCase({ ai });

    const invoice = createSentInvoice({ id: "inv-due", totalCents: 10_000, paidCents: 3_000 });
    repo.invoices = [invoice];

    await executeReminder(useCase, {
      invoiceId: "inv-due",
      language: "en",
      tone: "normal",
    });

    expect(ai.requests[0]?.userPrompt).toContain('"amountDueCents": 7000');
  });
});
