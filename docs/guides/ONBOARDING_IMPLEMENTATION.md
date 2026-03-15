# Implementing Onboarding for a New Module

This guide explains how to add the progressive Onboarding system to a new product module in Corely (e.g., Invoices, Taxes, CRM).

The system is configuration-driven and stores progress globally in `ext.kv` storage so no database migrations are needed for new flows.

## 1. Define the Journey Configuration

Create a Journey definition file inside your module's feature directory (e.g. `packages/web-features/src/modules/[your-module]/journeys/[your-module]-journey.ts`).

Define the `OnboardingJourneyConfig` detailing:

- Standard steps (Language, Business Basics)
- Your custom steps
- The checklist items visible in your dashboard widget

```typescript
import { OnboardingJourneyConfig } from "@corely/contracts";

export const MY_MODULE_JOURNEY: OnboardingJourneyConfig = {
  moduleKey: "my-module",
  journeyKey: "my-module-v1",
  title: { en: "Set up My Module" },
  description: { en: "Quick setup description" },
  supportedLocales: ["en", "de"],
  defaultLocale: "en",
  checklistItems: [ ... ],
  steps: [ ... ],
};
```

## 2. Export and Mount the Flow in the App Shell

In your application router (e.g., `apps/my-module/src/app/router.tsx`), mount the `OnboardingShell` component _outside_ of the typical Module-specific navigation sidebar, but _inside_ `RequireAuth`.

```tsx
import { OnboardingShell } from "@corely/web-features/modules/onboarding";
import { MY_MODULE_JOURNEY } from "@corely/web-features";

export const MyModuleOnboardingRoute = () => {
  return (
    <OnboardingShell
      config={MY_MODULE_JOURNEY}
      onCompleted={() => navigate("/dashboard")}
      onExit={() => navigate("/dashboard")}
    />
  );
};
```

## 3. Implement Custom Step Components

If your journey requires specific steps that don't exist in the shared Onboarding engine, create them and register them in `STEP_REGISTRY`.

```tsx
// packages/web-features/src/modules/onboarding/components/steps/MyCustomStep.tsx
import { StepComponentProps } from "../OnboardingStepRenderer";

export const MyCustomStep = ({ config, locale, onAdvance }: StepComponentProps) => {
  return (
    <div>
      <h1>{config.title[locale]}</h1>
      <button onClick={() => onAdvance({ customAnswer: "true" })}>Next</button>
    </div>
  );
};
```

Update `STEP_REGISTRY` in `packages/web-features/src/modules/onboarding/components/index.ts`.

## 4. Integrate the Dashboard Widget

Prompt the user to finish onboarding gracefully within the module's main dashboard layout using the `OnboardingChecklist` component.

```tsx
import { OnboardingChecklist } from "@corely/web-features/modules/onboarding";

export function MyModuleDashboard() {
  return (
    <div>
      {/* Display at top of dashboard */}
      <OnboardingChecklist config={MY_MODULE_JOURNEY} />
    </div>
  );
}
```

## 5. Automatic Fallback Navigation

To act on the "first-session" requirement, intercept users hitting the module's main layout who have not completed onboarding. This logic can be inside your `MyModuleShell.tsx`.

```typescript
const { isLoaded, progress, isComplete } = useOnboarding({
  config: MY_MODULE_JOURNEY,
});

useEffect(() => {
  if (isLoaded && !isComplete && !progress?.dismissed && !progress?.completedAt) {
    if (!location.pathname.startsWith("/onboarding")) {
      navigate("/onboarding/my-module");
    }
  }
}, [isLoaded, isComplete, progress, navigate]);
```

## Principles

- **First Session Optimization**: Focus ONLY on completing the user's _first_ valuable task in the module. Do not dump them into settings.
- **Low Friction**: Keep inputs minimal. Defer everything optional to standard "Settings" areas.
- **AI-Native Contextual Help**: Use the `aiHelpContext` on a step configuration to let the assistant explain what the step is (e.g., Explaining the difference between Gross vs Net settings).
- **ExtKV vs Database tables**: The `services/api/src/modules/onboarding` handles the save state idempotently via Tier 2 storage. Do not make standalone database `.prisma` models for user onboarding milestones.
