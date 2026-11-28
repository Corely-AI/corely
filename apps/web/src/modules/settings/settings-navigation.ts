export const settingsOverviewPath = "/settings";
export const accountSettingsSectionId = "my-account";
export const workspaceSettingsPath = "/settings/workspace";

const account = {
  to: `${settingsOverviewPath}#${accountSettingsSectionId}`,
  label: "settings.navigation.myAccount",
  description: "settings.navigation.myAccountDescription",
} as const;

const workspace = {
  to: workspaceSettingsPath,
  label: "settings.navigation.workspace",
  description: "settings.navigation.workspaceDescription",
} as const;

export function settingsDestinations(hasWorkspace: boolean) {
  return hasWorkspace ? [account, workspace] : [account];
}
