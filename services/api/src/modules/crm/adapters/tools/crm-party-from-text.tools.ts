import { z } from "zod";
import { isErr } from "@corely/kernel";
import {
  PartyProposalCardSchema,
  CreateCustomerInputSchema,
  UpdateCustomerInputSchema,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import {
  type CrmAiToolsContext,
  extractPartyFromText,
  extractedFields,
  findCustomerDuplicates,
  mapToolError,
  normalizeConfidence,
} from "./crm-tools.shared";

export const buildCrmPartyFromTextTools = (deps: CrmAiToolsContext): DomainToolPort[] => [
  {
    name: "crm_createPartyFromText",
    description:
      "Extract party (customer/supplier/contact/employee) information from unstructured text (e.g., email signature, business card, message). Detects duplicates and returns a proposal with confidence score.",
    kind: "server",
    inputSchema: z.object({
      sourceText: z.string().describe("The unstructured text containing party information"),
      suggestedRoles: z
        .array(z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"]))
        .optional()
        .describe("Optional role hints for the party"),
    }),
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = z
        .object({ sourceText: z.string(), suggestedRoles: z.array(z.string()).optional() })
        .safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { sourceText, suggestedRoles } = parsed.data;
      const object = await extractPartyFromText({
        deps,
        tenantId,
        userId,
        runId,
        toolName: "crm_createPartyFromText",
        sourceText,
        suggestedRolesLine: suggestedRoles?.length
          ? `Suggested roles: ${suggestedRoles.join(", ")}`
          : "",
      });

      const duplicates = await findCustomerDuplicates({
        deps,
        tenantId,
        workspaceId,
        userId,
        toolCallId,
        runId,
        email: object.email,
        displayName: object.displayName,
        pageSize: 5,
      });
      const confidence = normalizeConfidence(object.confidence);

      return PartyProposalCardSchema.parse({
        ok: true,
        proposal: {
          displayName: object.displayName,
          roles: object.roles,
          email: object.email,
          phone: object.phone,
          billingAddress: object.billingAddress,
          vatId: object.vatId,
          tags: object.tags,
          notes: object.notes,
          duplicates,
        },
        confidence,
        rationale: object.rationale,
        provenance: {
          sourceText,
          extractedFields: extractedFields(object),
        },
      });
    },
  },
  {
    name: "crm_createOrUpdateCustomerFromText",
    description:
      "Extract customer information from text, then create a new customer or update an existing one (by provided id or duplicate match).",
    kind: "server",
    inputSchema: z.object({
      sourceText: z.string().describe("The unstructured text containing customer information"),
      customerId: z.string().optional().describe("Optional existing customer ID to force update"),
      suggestedRoles: z
        .array(z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"]))
        .optional()
        .describe("Optional role hints for extraction"),
    }),
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = z
        .object({
          sourceText: z.string(),
          customerId: z.string().optional(),
          suggestedRoles: z.array(z.string()).optional(),
        })
        .safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { sourceText, customerId, suggestedRoles } = parsed.data;
      const roleHints = suggestedRoles && suggestedRoles.length > 0 ? suggestedRoles : ["CUSTOMER"];
      const object = await extractPartyFromText({
        deps,
        tenantId,
        userId,
        runId,
        toolName: "crm_createOrUpdateCustomerFromText",
        sourceText,
        suggestedRolesLine: `Suggested roles: ${roleHints.join(", ")}`,
      });

      const duplicates = await findCustomerDuplicates({
        deps,
        tenantId,
        workspaceId,
        userId,
        toolCallId,
        runId,
        email: object.email,
        displayName: object.displayName,
        pageSize: 5,
      });
      const confidence = normalizeConfidence(object.confidence);

      const bestDuplicate = duplicates[0];
      const targetCustomerId =
        customerId ?? (bestDuplicate && bestDuplicate.matchScore >= 0.9 ? bestDuplicate.id : null);
      const toolCtx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });

      if (targetCustomerId) {
        const patch: z.input<typeof UpdateCustomerInputSchema>["patch"] = {
          displayName: object.displayName,
        };
        if (object.email !== undefined) {
          patch.email = object.email;
        }
        if (object.phone !== undefined) {
          patch.phone = object.phone;
        }
        if (object.billingAddress !== undefined) {
          patch.billingAddress = object.billingAddress;
        }
        if (object.vatId !== undefined) {
          patch.vatId = object.vatId;
        }
        if (object.tags !== undefined) {
          patch.tags = object.tags;
        }
        if (object.notes !== undefined) {
          patch.notes = object.notes;
        }

        const updateInput = UpdateCustomerInputSchema.parse({
          id: targetCustomerId,
          patch,
        });
        const updateResult = await deps.party.updateCustomer.execute(updateInput, toolCtx);
        if (isErr(updateResult)) {
          return mapToolError(updateResult.error);
        }

        return {
          ok: true,
          action: "updated",
          customer: updateResult.value.customer,
          confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: extractedFields(object),
            matchedCustomerId: targetCustomerId,
            matchScore: customerId ? 1 : (bestDuplicate?.matchScore ?? null),
            duplicates,
          },
        };
      }

      const createInput = CreateCustomerInputSchema.parse({
        displayName: object.displayName,
        email: object.email,
        phone: object.phone,
        billingAddress: object.billingAddress,
        vatId: object.vatId,
        notes: object.notes,
        tags: object.tags,
        role: "CUSTOMER",
      });
      const createResult = await deps.party.createCustomer.execute(createInput, toolCtx);
      if (isErr(createResult)) {
        return mapToolError(createResult.error);
      }

      return {
        ok: true,
        action: "created",
        customer: createResult.value.customer,
        confidence,
        rationale: object.rationale,
        provenance: {
          sourceText,
          extractedFields: extractedFields(object),
          duplicates,
        },
      };
    },
  },
];
