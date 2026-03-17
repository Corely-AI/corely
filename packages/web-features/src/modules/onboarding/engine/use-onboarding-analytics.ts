import type { OnboardingAnalyticsEvent } from "@corely/contracts";
// Assuming analytics import exists in corely/web-shared
// import { analytics } from "@corely/web-shared/lib/analytics"

export const useOnboardingAnalytics = () => {
  const track = (eventName: string, properties: Record<string, unknown> = {}) => {
    const event: OnboardingAnalyticsEvent = {
      event: eventName,
      stepId: properties.stepId as string | undefined,
      locale: properties.locale as string | undefined,
      meta: properties.meta as Record<string, unknown> | undefined,
      occurredAt: new Date().toISOString(),
    };

    // In a real implementation this would map to Segment, PostHog, or similar analytics
    // analytics.track(event.event, event);
    console.log(`[Analytics] Tracked event: ${event.event}`, event);
  };

  return { track };
};
