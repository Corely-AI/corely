import type { BookCoachingEngagementUseCase } from "./use-cases/book-coaching-engagement.usecase";
import type { GetCoachingEngagementUseCase } from "./use-cases/get-coaching-engagement.usecase";
import type { ListCoachingEngagementsUseCase } from "./use-cases/list-coaching-engagements.usecase";
import type { ListCoachingSessionsUseCase } from "./use-cases/list-coaching-sessions.usecase";
import type { CreateCoachingCheckoutSessionUseCase } from "./use-cases/create-coaching-checkout-session.usecase";
import type { ProcessCoachingStripeWebhookUseCase } from "./use-cases/process-coaching-stripe-webhook.usecase";
import type { SignCoachingContractUseCase } from "./use-cases/sign-coaching-contract.usecase";
import type { GetCoachingPrepFormUseCase } from "./use-cases/get-coaching-prep-form.usecase";
import type { SubmitCoachingPrepFormUseCase } from "./use-cases/submit-coaching-prep-form.usecase";
import type { CompleteCoachingSessionUseCase } from "./use-cases/complete-coaching-session.usecase";
import type { GetCoachingDebriefFormUseCase } from "./use-cases/get-coaching-debrief-form.usecase";
import type { SubmitCoachingDebriefUseCase } from "./use-cases/submit-coaching-debrief.usecase";
import type { GenerateCoachingExportBundleUseCase } from "./use-cases/generate-coaching-export-bundle.usecase";
import type { GetCoachingArtifactSummaryUseCase } from "./use-cases/get-coaching-artifact-summary.usecase";

export class CoachingEngagementsApplication {
  constructor(
    public readonly bookEngagement: BookCoachingEngagementUseCase,
    public readonly getEngagement: GetCoachingEngagementUseCase,
    public readonly listEngagements: ListCoachingEngagementsUseCase,
    public readonly listSessions: ListCoachingSessionsUseCase,
    public readonly createCheckoutSession: CreateCoachingCheckoutSessionUseCase,
    public readonly processStripeWebhook: ProcessCoachingStripeWebhookUseCase,
    public readonly signContract: SignCoachingContractUseCase,
    public readonly getPrepForm: GetCoachingPrepFormUseCase,
    public readonly submitPrepForm: SubmitCoachingPrepFormUseCase,
    public readonly completeSession: CompleteCoachingSessionUseCase,
    public readonly getDebriefForm: GetCoachingDebriefFormUseCase,
    public readonly submitDebrief: SubmitCoachingDebriefUseCase,
    public readonly generateExportBundle: GenerateCoachingExportBundleUseCase,
    public readonly getArtifactSummary: GetCoachingArtifactSummaryUseCase
  ) {}
}
