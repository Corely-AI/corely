import { describe, expect, it } from "vitest";
import { PromptRegistry } from "../registry/prompt-registry";
import { StaticPromptProvider } from "../providers/static/static-prompt-provider";
import { promptDefinitions } from "../prompts";

const registry = new PromptRegistry([new StaticPromptProvider(promptDefinitions)]);

const context = { environment: "dev", workspaceKind: "COMPANY", tenantId: "tenant-1" };

describe("prompt snapshots", () => {
  it("renders copilot system prompt", () => {
    const result = registry.render("copilot.system", context, {});
    expect(result.content).toMatchInlineSnapshot(
      `"You are the Corely Copilot. Use the provided tools for all factual or data retrieval tasks. When asked to search, list, or look up customers, always call the customer_search tool even if the user provides no query; send an empty or undefined query to list all customers. When creating or drafting an invoice for a named customer, call invoice_create_from_customer first to resolve the customer; only use collect_inputs after customer resolution or when required invoice fields are missing. When defining collect_inputs fields, use the most specific type (date for YYYY-MM-DD, datetime for date+time, boolean for yes/no). Never use type text for dates or datetimes; do not use regex patterns for those fields. Do not make up customer data."`
    );
  });

  it("renders approvals policy prompt", () => {
    const result = registry.render("approvals.suggest_policy", context, {
      ACTION_KEY: "sales.create-invoice",
      DESCRIPTION: "Issue invoice",
      SAMPLE_PAYLOAD: '{"amountCents":12000}',
    });
    expect(result.content).toMatchInlineSnapshot(
      `"Suggest an approval policy for the following action.\n\nAction key: sales.create-invoice\nDescription: Issue invoice\nSample payload:\n<<SAMPLE_PAYLOAD>>\n{"amountCents":12000}\n<<END:SAMPLE_PAYLOAD>>\n\nReturn steps and rules that indicate when approval is required."`
    );
  });

  it("renders CRM follow-up prompt", () => {
    const result = registry.render("crm.follow_up_suggestions", context, {
      DEAL_TITLE: "Website redesign",
      DEAL_STAGE: "proposal",
      DEAL_AMOUNT: "EUR 12000",
      DEAL_EXPECTED_CLOSE: "2025-02-01",
      DEAL_NOTES: "Asked about timeline",
      EXISTING_ACTIVITIES: "- CALL: Intro call",
      CONTEXT_SECTION: "Recent Context:\nCustomer asked for revised scope.",
    });

    expect(result.content).toMatchInlineSnapshot(
      `"Generate 2-4 suggested follow-up activities for this deal:\n\nDeal: Website redesign\nStage: proposal\nAmount: EUR 12000\nExpected Close: 2025-02-01\nNotes: Asked about timeline\n\nExisting Activities:\n<<EXISTING_ACTIVITIES>>\n- CALL: Intro call\n<<END:EXISTING_ACTIVITIES>>\n\n<<CONTEXT_SECTION>>\nRecent Context:\nCustomer asked for revised scope.\n<<END:CONTEXT_SECTION>>\n\nSuggest practical next steps to move this deal forward."`
    );
  });
});
