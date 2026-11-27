import type { WorkspaceNavigationGroup } from "@corely/contracts";

/** Resolve the menu links available to both the sidebar and navigation commands. */
export function filterSidebarNavigation(
  groups: WorkspaceNavigationGroup[],
  isHostScope: boolean,
  hiddenItemIds: readonly string[] = []
): WorkspaceNavigationGroup[] {
  if (isHostScope && hiddenItemIds.length === 0) {
    return groups;
  }

  const hiddenIds = new Set(hiddenItemIds);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !hiddenIds.has(item.id) && (isHostScope || !item.route?.startsWith("/settings/platform"))
      ),
    }))
    .filter((group) => group.items.length > 0);
}
