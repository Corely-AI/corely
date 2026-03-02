const FREELANCER_SCOPE_APPS = [
  "freelancer",
  "assistant",
  "portfolio",
  "invoices",
  "expenses",
  "tax",
] as const;

const APP_SCOPE_EXPANSIONS: Record<string, readonly string[]> = {
  freelancer: FREELANCER_SCOPE_APPS,
};

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
