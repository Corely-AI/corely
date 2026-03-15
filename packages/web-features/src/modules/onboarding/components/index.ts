import { STEP_REGISTRY } from "./OnboardingStepRenderer";
import { WelcomeStep } from "./steps/WelcomeStep";
import { LanguageStep } from "./steps/LanguageStep";
import { BusinessBasicsStep } from "./steps/BusinessBasicsStep";
import { WorkflowSourceStep } from "./steps/WorkflowSourceStep";
import { OpeningBalanceStep } from "./steps/OpeningBalanceStep";
import { FirstEntriesStep } from "./steps/FirstEntriesStep";
import { FirstReceiptStep } from "./steps/FirstReceiptStep";
import { TodayStatusStep } from "./steps/TodayStatusStep";
import { DailyClosingStep } from "./steps/DailyClosingStep";
import { PostValueStep } from "./steps/PostValueStep";

// Register all standard step components
STEP_REGISTRY["welcome"] = WelcomeStep;
STEP_REGISTRY["language"] = LanguageStep;
STEP_REGISTRY["business-basics"] = BusinessBasicsStep;
STEP_REGISTRY["workflow-source"] = WorkflowSourceStep;
STEP_REGISTRY["opening-balance"] = OpeningBalanceStep;
STEP_REGISTRY["first-entries"] = FirstEntriesStep;
STEP_REGISTRY["first-receipt"] = FirstReceiptStep;
STEP_REGISTRY["today-status"] = TodayStatusStep;
STEP_REGISTRY["daily-closing"] = DailyClosingStep;
STEP_REGISTRY["post-value"] = PostValueStep;

export * from "./OnboardingChecklist";
export * from "./OnboardingHeader";
export * from "./OnboardingShell";
export * from "./OnboardingStepRenderer";
export * from "./OnboardingAIHelper";
