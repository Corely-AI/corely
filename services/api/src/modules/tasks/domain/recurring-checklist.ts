import { createHash } from "node:crypto";
import { addCivilDays, civilDateAt } from "@corely/kernel";
import {
  ChecklistTemplateSchema,
  ChecklistPlanSchema,
  type ChecklistPlan,
  type ChecklistTemplate,
} from "@corely/contracts";
import { z } from "zod";
export const ChecklistRecordSchema = ChecklistTemplateSchema.extend({
  plans: z
    .array(ChecklistPlanSchema.extend({ publisherUserId: z.string() }).strict())
    .min(1)
    .max(50),
  nextEvaluationAt: z.string().datetime(),
}).strict();
export type ChecklistRecord = z.infer<typeof ChecklistRecordSchema>;
export function occurrenceId(...parts: string[]): string {
  // UUID v5: fixed namespace + length-safe tuple name. Revision is deliberately excluded.
  const ns = Buffer.from("f510224873c8553eb69a1d6f5af84339", "hex");
  const bytes = createHash("sha1")
    .update(ns)
    .update(JSON.stringify(parts))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function planOnDate(template: Pick<ChecklistRecord, "plans">, date: string) {
  const plan = [...template.plans].reverse().find((p) => p.effectiveFrom <= date);
  if (
    !plan ||
    (plan.effectiveUntil && date > plan.effectiveUntil) ||
    !plan.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())
  ) {
    return null;
  }
  return plan;
}
export function catchupDates(template: ChecklistRecord, now: Date): string[] {
  const today = civilDateAt(now, template.timezone);
  return [-2, -1, 0]
    .map((delta) => addCivilDays(today, delta))
    .filter((date) => date >= template.plans[0].effectiveFrom && !!planOnDate(template, date));
}
export function isPausedOnDate(template: Pick<ChecklistTemplate, "pauses">, date: string): boolean {
  return template.pauses.some(
    (pause) => pause.fromDate <= date && (!pause.throughDate || pause.throughDate >= date)
  );
}
export function stripPublisher(plan: ChecklistRecord["plans"][number]): ChecklistPlan {
  return ChecklistPlanSchema.strip().parse(plan);
}
