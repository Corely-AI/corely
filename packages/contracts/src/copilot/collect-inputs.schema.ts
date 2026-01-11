import { z } from "zod";

const BaseFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().default(false),
  placeholder: z
    .string()
    .optional()
    .describe("Optional hint text. For dates use YYYY-MM-DD; for datetimes use YYYY-MM-DDTHH:mm."),
  helpText: z.string().optional(),
  patternLabel: z.string().optional(),
  defaultValue: z.any().optional(),
  unit: z.string().optional(),
  suffix: z.string().optional(),
});

const SelectOptionSchema = z.object({
  value: z.any(),
  label: z.string(),
  disabled: z.boolean().optional(),
  group: z.string().optional(),
});

const OptionsSourceSchema = z.object({
  kind: z.string(),
  searchQuery: z.string().optional(),
  params: z.record(z.string(), z.any()).optional(),
  debounceMs: z.number().int().positive().optional(),
});

const TextFieldSchema = BaseFieldSchema.extend({
  type: z.literal("text"),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  pattern: z
    .string()
    .optional()
    .describe("Regex for text/textarea only. Do not use for date/datetime fields."),
});

const TextareaFieldSchema = BaseFieldSchema.extend({
  type: z.literal("textarea"),
  minLength: z.number().int().optional(),
  maxLength: z.number().int().optional(),
  pattern: z
    .string()
    .optional()
    .describe("Regex for text/textarea only. Do not use for date/datetime fields."),
});

const NumberFieldSchema = BaseFieldSchema.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
});

const BooleanFieldSchema = BaseFieldSchema.extend({
  type: z.literal("boolean"),
});

const DateFieldSchema = BaseFieldSchema.extend({
  type: z.literal("date"),
});

const DateTimeFieldSchema = BaseFieldSchema.extend({
  type: z.literal("datetime"),
});

const SelectFieldSchema = BaseFieldSchema.extend({
  type: z.literal("select"),
  options: z.array(SelectOptionSchema).optional(),
  optionsSource: OptionsSourceSchema.optional(),
});

const RepeaterUiSchema = z.object({
  layout: z.enum(["table", "cards"]).optional(),
  addLabel: z.string().optional(),
  removeLabel: z.string().optional(),
  rowLabelKey: z.string().optional(),
});

const NonRepeaterFieldSchema = z.discriminatedUnion("type", [
  TextFieldSchema,
  NumberFieldSchema,
  SelectFieldSchema,
  TextareaFieldSchema,
  DateFieldSchema,
  DateTimeFieldSchema,
  BooleanFieldSchema,
]);

const RepeaterFieldSchema = BaseFieldSchema.extend({
  type: z.literal("repeater"),
  itemFields: z.array(NonRepeaterFieldSchema),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
  ui: RepeaterUiSchema.optional(),
});

export const CollectInputFieldSchema: z.ZodTypeAny = z
  .lazy(() =>
    z.discriminatedUnion("type", [...NonRepeaterFieldSchema.options, RepeaterFieldSchema])
  )
  .superRefine((value, ctx) => {
    if (value.type === "select") {
      const hasOptions = Array.isArray(value.options) && value.options.length > 0;
      if (!hasOptions && !value.optionsSource) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select fields require options or an optionsSource.",
        });
      }
    }
    if (value.type === "repeater") {
      if (value.maxItems !== undefined && value.minItems !== undefined) {
        if (value.maxItems < value.minItems) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "maxItems cannot be less than minItems.",
          });
        }
      }
    }
  });

export type CollectInputField = z.infer<typeof CollectInputFieldSchema>;
export type CollectInputItemField = z.infer<typeof NonRepeaterFieldSchema>;
export type CollectRepeaterField = Extract<CollectInputField, { type: "repeater" }>;

export const CollectInputsToolInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(CollectInputFieldSchema),
  submitLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  allowCancel: z.boolean().default(true),
  context: z.record(z.string(), z.any()).optional(),
});

export type CollectInputsToolInput = z.infer<typeof CollectInputsToolInputSchema>;

export const CollectInputsToolOutputSchema = z.object({
  values: z.record(z.string(), z.any()),
  meta: z
    .object({
      filledAt: z.string().optional(),
      cancelled: z.boolean().optional(),
      editedKeys: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CollectInputsToolOutput = z.infer<typeof CollectInputsToolOutputSchema>;
