import { ValidationFailedError } from "@corely/domain";
import { BillingPlanScheduleSchema } from "@corely/contracts/classes";
import type { ClassEnrollmentBillingPlanType } from "../entities/classes.entities";

export const validateBillingPlan = (input: {
  type: ClassEnrollmentBillingPlanType;
  scheduleJson: unknown;
}) => {
  const parsed = BillingPlanScheduleSchema.safeParse(input.scheduleJson);
  if (!parsed.success) {
    throw new ValidationFailedError("Invalid billing plan schedule", [
      {
        message: "scheduleJson does not match billing plan schema",
        members: ["scheduleJson"],
      },
    ]);
  }

  if (parsed.data.type !== input.type) {
    throw new ValidationFailedError("Billing plan type mismatch", [
      {
        message: `scheduleJson.type ${parsed.data.type} must match plan type ${input.type}`,
        members: ["type", "scheduleJson"],
      },
    ]);
  }

  if (parsed.data.type === "INSTALLMENTS") {
    const installments = parsed.data.data.installments;
    for (let index = 1; index < installments.length; index += 1) {
      const prev = installments[index - 1].dueDate;
      const current = installments[index].dueDate;
      if (current < prev) {
        throw new ValidationFailedError("Installment due dates must be non-decreasing", [
          {
            message: "Installments must be ordered by dueDate ascending",
            members: ["scheduleJson.installments"],
          },
        ]);
      }
    }
  }
};
