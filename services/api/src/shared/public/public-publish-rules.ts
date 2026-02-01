import { NotFoundError } from "@corely/kernel";
import type { UseCaseContext } from "@corely/kernel";
import {
  PUBLIC_CONTEXT_METADATA_KEY,
  type PublicModuleKey,
  type PublicWorkspaceMetadata,
} from "./public-workspace.types";

export const publicWorkspaceNotResolvedError = () =>
  new NotFoundError("Public workspace not resolved", undefined, "Public:WorkspaceNotResolved");

export const publicWorkspaceNotPublishedError = () =>
  new NotFoundError("Public site not published", undefined, "Public:NotPublished");

export const getPublicWorkspaceMetadata = (ctx: UseCaseContext): PublicWorkspaceMetadata | null => {
  const metadata = ctx.metadata?.[PUBLIC_CONTEXT_METADATA_KEY];
  return metadata ? (metadata as PublicWorkspaceMetadata) : null;
};

export const assertPublicModuleEnabled = (
  ctx: UseCaseContext,
  moduleKey: PublicModuleKey
): NotFoundError | null => {
  const publicMeta = getPublicWorkspaceMetadata(ctx);
  if (!publicMeta) {
    return publicWorkspaceNotResolvedError();
  }

  if (!publicMeta.publicEnabled) {
    return publicWorkspaceNotPublishedError();
  }

  if (publicMeta.publicModules && publicMeta.publicModules[moduleKey] === false) {
    return publicWorkspaceNotPublishedError();
  }

  return null;
};
