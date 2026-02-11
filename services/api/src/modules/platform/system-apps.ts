export const SYSTEM_APP_IDS = new Set<string>(["core", "platform", "workspaces"]);

export const isSystemAppId = (appId: string): boolean => SYSTEM_APP_IDS.has(appId);
