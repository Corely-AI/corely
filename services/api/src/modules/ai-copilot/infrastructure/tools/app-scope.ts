const FREELANCER_SCOPE_APPS = [
  "freelancer",
  "assistant",
  "portfolio",
  "invoices",
  "expenses",
  "tax",
] as const;

const FREELANCER_SCOPE_CONTEXTS = [
  "freelancer",
  "assistant",
  "portfolio",
  "invoices",
  "expenses",
  "tax",
] as const;

const APP_SCOPE_EXPANSIONS: Record<string, readonly string[]> = {
  freelancer: FREELANCER_SCOPE_APPS,
  assistant: FREELANCER_SCOPE_APPS,
  portfolio: FREELANCER_SCOPE_APPS,
  invoices: FREELANCER_SCOPE_APPS,
  expenses: FREELANCER_SCOPE_APPS,
  tax: FREELANCER_SCOPE_APPS,
};

export const isFreelancerScopedContext = (activeAppId?: string): boolean =>
  !!activeAppId &&
  FREELANCER_SCOPE_CONTEXTS.includes(activeAppId as (typeof FREELANCER_SCOPE_CONTEXTS)[number]);

export const isToolInActiveAppScope = (toolAppId: string | undefined, activeAppId?: string) => {
  if (!toolAppId || toolAppId === "common") {
    return true;
  }

  if (!activeAppId) {
    return true;
  }

  if (toolAppId === activeAppId) {
    return true;
  }

  const expandedScope = APP_SCOPE_EXPANSIONS[activeAppId];
  if (!expandedScope) {
    return false;
  }

  return expandedScope.includes(toolAppId);
};
