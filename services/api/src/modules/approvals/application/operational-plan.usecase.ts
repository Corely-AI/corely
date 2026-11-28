import { createHash } from "node:crypto";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { OperationalPlanRequestSchema, type OperationalPlanResponse } from "@corely/contracts";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { AppointmentReviewUseCase } from "./appointment-review.usecase";
import type { ReviewActor } from "./ports/appointment-review.port";

@Injectable()
export class OperationalPlanUseCase {
  constructor(
    private readonly reviews: AppointmentReviewUseCase,
    @Inject(AuthorizeWorkspaceUseCase)
    private readonly workspaceAuthority: Pick<AuthorizeWorkspaceUseCase, "execute">
  ) {}

  async propose(actor: ReviewActor, body: unknown): Promise<OperationalPlanResponse> {
    const plan = OperationalPlanRequestSchema.parse(body);
    await this.workspaceAuthority.execute({ ...actor, manage: true });
    const actions: OperationalPlanResponse["actions"] = [];
    for (const [index, input] of plan.actions.entries()) {
      const key = createHash("sha256")
        .update(JSON.stringify([plan.key, index]))
        .digest("hex");
      try {
        const review =
          input.kind === "replacement"
            ? await this.reviews.proposeReplacement(actor, input.request, key)
            : input.kind === "task"
              ? await this.reviews.proposeTaskCompletion(actor, input.taskId, key)
              : input.kind === "confirmation"
                ? await this.reviews.proposeConfirmation(
                    actor,
                    input.bookingId,
                    key,
                    input.note,
                    input.scheduledFor
                  )
                : await this.reviews.proposeMessage(
                    actor,
                    input.replacementId,
                    input.note,
                    key,
                    undefined,
                    input.scheduledFor
                  );
        actions.push({ index, review });
      } catch (error) {
        const reason =
          error instanceof HttpException && error.getStatus() < 500
            ? "action-unavailable"
            : "temporarily-unavailable";
        actions.push({ index, error: reason });
      }
    }
    return { actions };
  }
}
