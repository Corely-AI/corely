import {
  AppDirectoryDestinationSchema,
  isSafeSsoReturnPath,
  type AppCatalogItem,
} from "@corely/contracts";
import { catalogLaunchUrl } from "./focused-shell-navigation";
import { workspaceLaunchUrl } from "../session/workspace-launch";

export function catalogMetadata(app: AppCatalogItem) {
  return app.launch?.availability === "available" ? app.launch : (app.directory ?? app.launch);
}

export function catalogEntryUrl(
  app: AppCatalogItem,
  workspaceId: string,
  locale?: "en" | "de" | "vi"
): string | undefined {
  if (!app.enabled) {
    return undefined;
  }
  // A released focused client takes precedence; never bypass its invalid configuration.
  if (app.launch?.availability === "available") {
    return withLanguage(catalogLaunchUrl(app, workspaceId), locale);
  }
  const parsed = AppDirectoryDestinationSchema.safeParse(app.directory?.destination);
  return withLanguage(
    parsed.success && isSafeSsoReturnPath(parsed.data.path)
      ? workspaceLaunchUrl(parsed.data.origin, workspaceId, parsed.data.path)
      : undefined,
    locale
  );
}

function withLanguage(destination: string | undefined, locale?: "en" | "de" | "vi") {
  if (!destination || !locale) {
    return destination;
  }
  const url = new URL(destination);
  url.searchParams.set("lang", locale);
  return url.href;
}
