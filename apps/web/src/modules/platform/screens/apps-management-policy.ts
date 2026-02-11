export interface AppManagementPolicy {
  appId: string;
  forceEnabled: boolean;
  hideDisableAction: boolean;
  reason?: string;
}

const FORCE_ENABLED_APP_POLICIES: Readonly<Record<string, Omit<AppManagementPolicy, "appId">>> = {
  core: {
    forceEnabled: true,
    hideDisableAction: true,
    reason: "Required platform app",
  },
  platform: {
    forceEnabled: true,
    hideDisableAction: true,
    reason: "Host management app is always enabled",
  },
  workspaces: {
    forceEnabled: true,
    hideDisableAction: true,
    reason: "Required workspace app",
  },
};

export const getAppManagementPolicy = (appId: string): AppManagementPolicy => {
  const rule = FORCE_ENABLED_APP_POLICIES[appId];
  if (rule) {
    return { appId, ...rule };
  }

  return {
    appId,
    forceEnabled: false,
    hideDisableAction: false,
  };
};
