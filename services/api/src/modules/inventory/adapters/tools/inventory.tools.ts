import { z } from "zod";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { EnvService } from "@corely/config";
import { type PromptRegistry } from "@corely/prompts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import type { InventoryApplication } from "../../application/inventory.application";
import {
  ProductProposalCardSchema,
  ReceiptDraftProposalCardSchema,
  DeliveryDraftProposalCardSchema,
  ReorderPolicyProposalCardSchema,
  InventoryAnomaliesCardSchema,
  PickListCardSchema,
  StockChangeExplanationCardSchema,
} from "@corely/contracts";
import { type PromptUsageLogger } from "../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../shared/prompts/prompt-context";

export const buildInventoryTools = (
  _app: InventoryApplication,
  env: EnvService,
  promptRegistry: PromptRegistry,
  promptUsageLogger: PromptUsageLogger
): DomainToolPort[] => {
  const defaultModel = anthropic(env.AI_MODEL_ID) as unknown as LanguageModel;

  return [
    {
      name: "inventory_createProductFromText",
      description: "Extract a product proposal from text.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
      }),
      execute: async ({ tenantId, userId, input, runId }) => {
        const parsed = z.object({ sourceText: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText } = parsed.data;
        const prompt = promptRegistry.render(
          "inventory.extract_product_proposal",
          buildPromptContext({ env, tenantId }),
          { SOURCE_TEXT: sourceText }
        );
        promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "inventory_createProductFromText",
          purpose: "inventory.extract_product_proposal",
        });

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            sku: z.string().optional(),
            name: z.string(),
            productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]),
            unitOfMeasure: z.string(),
            barcode: z.string().optional(),
            defaultSalesPriceCents: z.number().int().nonnegative().optional(),
            defaultPurchaseCostCents: z.number().int().nonnegative().optional(),
            tags: z.array(z.string()).optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        return ProductProposalCardSchema.parse({
          ok: true,
          proposal: {
            sku: object.sku,
            name: object.name,
            productType: object.productType,
            unitOfMeasure: object.unitOfMeasure,
            barcode: object.barcode,
            defaultSalesPriceCents: object.defaultSalesPriceCents,
            defaultPurchaseCostCents: object.defaultPurchaseCostCents,
            tags: object.tags,
            duplicates: [],
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });
      },
    },
    {
      name: "inventory_generateReceiptFromText",
      description: "Generate a receipt draft proposal from text.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
      }),
      execute: async ({ tenantId, userId, input, runId }) => {
        const parsed = z.object({ sourceText: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText } = parsed.data;
        const prompt = promptRegistry.render(
          "inventory.extract_receipt_draft",
          buildPromptContext({ env, tenantId }),
          { SOURCE_TEXT: sourceText }
        );
        promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "inventory_generateReceiptFromText",
          purpose: "inventory.extract_receipt_draft",
        });

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            supplierName: z.string().optional(),
            scheduledDate: z.string().optional(),
            postingDate: z.string().optional(),
            reference: z.string().optional(),
            notes: z.string().optional(),
            lineItems: z.array(
              z.object({
                productName: z.string().optional(),
                sku: z.string().optional(),
                quantity: z.number().positive(),
                unitCostCents: z.number().int().nonnegative().optional(),
              })
            ),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        return ReceiptDraftProposalCardSchema.parse({
          ok: true,
          proposal: {
            supplierName: object.supplierName,
            scheduledDate: object.scheduledDate,
            postingDate: object.postingDate,
            reference: object.reference,
            notes: object.notes,
            lineItems: object.lineItems,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });
      },
    },
    {
      name: "inventory_generateDeliveryFromText",
      description: "Generate a delivery draft proposal from text.",
      kind: "server",
      inputSchema: z.object({
        sourceText: z.string(),
      }),
      execute: async ({ tenantId, userId, input, runId }) => {
        const parsed = z.object({ sourceText: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const { sourceText } = parsed.data;
        const prompt = promptRegistry.render(
          "inventory.extract_delivery_draft",
          buildPromptContext({ env, tenantId }),
          { SOURCE_TEXT: sourceText }
        );
        promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "inventory_generateDeliveryFromText",
          purpose: "inventory.extract_delivery_draft",
        });

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            customerName: z.string().optional(),
            scheduledDate: z.string().optional(),
            postingDate: z.string().optional(),
            reference: z.string().optional(),
            notes: z.string().optional(),
            lineItems: z.array(
              z.object({
                productName: z.string().optional(),
                sku: z.string().optional(),
                quantity: z.number().positive(),
              })
            ),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        return DeliveryDraftProposalCardSchema.parse({
          ok: true,
          proposal: {
            customerName: object.customerName,
            scheduledDate: object.scheduledDate,
            postingDate: object.postingDate,
            reference: object.reference,
            notes: object.notes,
            lineItems: object.lineItems,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            sourceText,
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });
      },
    },
    {
      name: "inventory_suggestReorderPolicy",
      description: "Suggest a reorder policy for a product.",
      kind: "server",
      inputSchema: z.object({
        productId: z.string(),
        warehouseId: z.string(),
        historyWindowDays: z.number().int().positive().optional(),
      }),
      execute: async ({ tenantId, userId, input, runId }) => {
        const parsed = z
          .object({
            productId: z.string(),
            warehouseId: z.string(),
            historyWindowDays: z.number().int().positive().optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        const prompt = promptRegistry.render(
          "inventory.suggest_reorder_policy",
          buildPromptContext({ env, tenantId }),
          {}
        );
        promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: env.AI_MODEL_ID,
          provider: "anthropic",
          tenantId,
          userId,
          runId,
          toolName: "inventory_suggestReorderPolicy",
          purpose: "inventory.suggest_reorder_policy",
        });

        const { object } = await generateObject({
          model: defaultModel,
          schema: z.object({
            minQty: z.number().nonnegative(),
            maxQty: z.number().nonnegative().optional(),
            reorderPoint: z.number().nonnegative().optional(),
            leadTimeDays: z.number().int().nonnegative().optional(),
            confidence: z.number().min(0).max(1),
            rationale: z.string(),
          }),
          prompt: prompt.content,
        });

        return ReorderPolicyProposalCardSchema.parse({
          ok: true,
          proposal: {
            productId: parsed.data.productId,
            warehouseId: parsed.data.warehouseId,
            minQty: object.minQty,
            maxQty: object.maxQty,
            reorderPoint: object.reorderPoint,
            leadTimeDays: object.leadTimeDays,
          },
          confidence: object.confidence,
          rationale: object.rationale,
          provenance: {
            extractedFields: Object.keys(object).filter(
              (k) => k !== "confidence" && k !== "rationale"
            ),
          },
        });
      },
    },
    {
      name: "inventory_anomalyScan",
      description: "Scan inventory activity for anomalies.",
      kind: "server",
      needsApproval: true,
      inputSchema: z.object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        warehouseId: z.string().optional(),
      }),
      execute: async ({ input }) => {
        const parsed = z
          .object({
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
            warehouseId: z.string().optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return InventoryAnomaliesCardSchema.parse({
          ok: true,
          anomalies: [],
          confidence: 0.4,
          rationale: "No anomaly signals were calculated for this request.",
          provenance: {
            extractedFields: [],
          },
        });
      },
    },
    {
      name: "inventory_pickListAssistant",
      description: "Generate a pick list and checklist for a delivery.",
      kind: "server",
      inputSchema: z.object({
        deliveryDocumentId: z.string(),
      }),
      execute: async ({ input }) => {
        const parsed = z.object({ deliveryDocumentId: z.string() }).safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return PickListCardSchema.parse({
          ok: true,
          deliveryDocumentId: parsed.data.deliveryDocumentId,
          items: [],
          checklist: ["Verify quantities", "Confirm packaging", "Stage for pickup"],
          confidence: 0.5,
          rationale: "No location data supplied; checklist generated from defaults.",
          provenance: { extractedFields: [] },
        });
      },
    },
    {
      name: "inventory_explainStockChange",
      description: "Explain stock changes for a product.",
      kind: "server",
      inputSchema: z.object({
        productId: z.string(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      }),
      execute: async ({ input }) => {
        const parsed = z
          .object({
            productId: z.string(),
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
          })
          .safeParse(input);
        if (!parsed.success) {
          return validationError(parsed.error.flatten());
        }

        return StockChangeExplanationCardSchema.parse({
          ok: true,
          summary: "Stock changed due to receipts and deliveries in the selected period.",
          highlights: [],
          confidence: 0.5,
          rationale: "No ledger data was attached to this request.",
          provenance: { extractedFields: [] },
        });
      },
    },
  ];
};
