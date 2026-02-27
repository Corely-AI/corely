import { z } from "zod";
import { isErr } from "@corely/kernel";
import {
  DealProposalCardSchema,
  CreateCustomerInputSchema,
  CreateDealInputSchema,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import {
  type CrmAiToolsContext,
  extractDealFromText,
  extractPartyFromText,
  extractedFields,
  findCustomerDuplicates,
  mapToolError,
  normalizeConfidence,
  normalizeDealNumericFields,
} from "./crm-tools.shared";

export const buildCrmDealFromTextTools = (deps: CrmAiToolsContext): DomainToolPort[] => [
  {
    name: "crm_createDealFromText",
    description:
      "Extract deal/opportunity information from text (e.g., meeting notes, email). Returns a proposal with confidence score.",
    kind: "server",
    inputSchema: z.object({
      sourceText: z.string().describe("The unstructured text containing deal information"),
      partyId: z.string().optional().describe("Optional party ID to associate the deal with"),
    }),
    execute: async ({ tenantId, userId, input, runId }) => {
      const parsed = z
        .object({ sourceText: z.string(), partyId: z.string().optional() })
        .safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { sourceText, partyId } = parsed.data;
      const extractedDeal = await extractDealFromText({
        deps,
        tenantId,
        userId,
        runId,
        toolName: "crm_createDealFromText",
        sourceText,
        associatedPartyLine: partyId ? `Associate with party ID: ${partyId}` : "",
      });
      const object = normalizeDealNumericFields(extractedDeal);
      const confidence = normalizeConfidence(object.confidence);

      return DealProposalCardSchema.parse({
        ok: true,
        proposal: {
          title: object.title,
          partyId,
          stageId: object.stageId,
          amountCents: object.amountCents,
          currency: object.currency,
          expectedCloseDate: object.expectedCloseDate,
          probability: object.probability,
          notes: object.notes,
          tags: object.tags ?? [],
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
    name: "crm_createDealFromTextPersisted",
    description:
      "Extract deal information from text and create a persisted CRM deal. If partyId is not provided, the tool tries to match or create a customer from the same text.",
    kind: "server",
    inputSchema: z.object({
      sourceText: z.string().describe("The unstructured text containing deal information"),
      partyId: z.string().optional().describe("Optional existing party/customer ID"),
      autoCreateCustomer: z
        .boolean()
        .optional()
        .default(true)
        .describe("Create a customer from text if no matching party is found"),
    }),
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = z
        .object({
          sourceText: z.string(),
          partyId: z.string().optional(),
          autoCreateCustomer: z.boolean().optional().default(true),
        })
        .safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const { sourceText, autoCreateCustomer } = parsed.data;
      let resolvedPartyId = parsed.data.partyId;
      let partyResolution: {
        mode: "provided" | "matched" | "created";
        partyId: string;
        displayName?: string;
        confidence: number;
      } | null = resolvedPartyId
        ? { mode: "provided", partyId: resolvedPartyId, confidence: 1 }
        : null;

      const extractedDeal = await extractDealFromText({
        deps,
        tenantId,
        userId,
        runId,
        toolName: "crm_createDealFromTextPersisted",
        sourceText,
        associatedPartyLine: resolvedPartyId ? `Associate with party ID: ${resolvedPartyId}` : "",
      });
      const dealObject = normalizeDealNumericFields(extractedDeal);
      const confidence = normalizeConfidence(dealObject.confidence);

      const toolCtx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });
      let partyDuplicates: Array<{
        id: string;
        displayName: string;
        email?: string;
        matchScore: number;
      }> = [];

      if (!resolvedPartyId) {
        const partyObject = await extractPartyFromText({
          deps,
          tenantId,
          userId,
          runId,
          toolName: "crm_createDealFromTextPersisted",
          sourceText,
          suggestedRolesLine: "Suggested roles: CUSTOMER",
        });

        partyDuplicates = await findCustomerDuplicates({
          deps,
          tenantId,
          workspaceId,
          userId,
          toolCallId,
          runId,
          email: partyObject.email,
          displayName: partyObject.displayName,
          pageSize: 5,
        });
        const bestMatch = partyDuplicates[0];
        if (bestMatch && bestMatch.matchScore >= 0.9) {
          resolvedPartyId = bestMatch.id;
          partyResolution = {
            mode: "matched",
            partyId: bestMatch.id,
            displayName: bestMatch.displayName,
            confidence: bestMatch.matchScore,
          };
        } else if (autoCreateCustomer) {
          const createInput = CreateCustomerInputSchema.parse({
            displayName: partyObject.displayName,
            email: partyObject.email,
            phone: partyObject.phone,
            billingAddress: partyObject.billingAddress,
            vatId: partyObject.vatId,
            notes: partyObject.notes,
            tags: partyObject.tags,
            role: "CUSTOMER",
          });
          const createCustomerResult = await deps.party.createCustomer.execute(
            createInput,
            toolCtx
          );
          if (isErr(createCustomerResult)) {
            return mapToolError(createCustomerResult.error);
          }

          resolvedPartyId = createCustomerResult.value.customer.id;
          partyResolution = {
            mode: "created",
            partyId: createCustomerResult.value.customer.id,
            displayName: createCustomerResult.value.customer.displayName,
            confidence: normalizeConfidence(partyObject.confidence),
          };
        } else {
          return {
            ok: false,
            code: "PARTY_REQUIRED",
            message:
              "Could not resolve a customer from text. Provide partyId or set autoCreateCustomer=true.",
            details: {
              duplicates: partyDuplicates,
            },
          };
        }
      }

      if (!resolvedPartyId) {
        return {
          ok: false,
          code: "PARTY_REQUIRED",
          message: "A partyId is required to create a deal.",
        };
      }

      const createDealInput = CreateDealInputSchema.parse({
        title: dealObject.title,
        partyId: resolvedPartyId,
        stageId: dealObject.stageId,
        amountCents: dealObject.amountCents,
        currency: dealObject.currency,
        expectedCloseDate: dealObject.expectedCloseDate,
        probability: dealObject.probability,
        notes: dealObject.notes,
        tags: dealObject.tags,
      });
      const createDealResult = await deps.crm.createDeal.execute(createDealInput, toolCtx);
      if (isErr(createDealResult)) {
        return mapToolError(createDealResult.error);
      }

      return {
        ok: true,
        deal: createDealResult.value.deal,
        partyResolution,
        confidence,
        rationale: dealObject.rationale,
        provenance: {
          sourceText,
          extractedFields: extractedFields(dealObject),
          duplicates: partyDuplicates,
        },
      };
    },
  },
];
