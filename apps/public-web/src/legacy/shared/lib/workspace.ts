import { useParams } from "react-router-dom";

export const useWorkspaceSlug = () => {
  const params = useParams();
  return typeof params.workspaceSlug === "string" ? params.workspaceSlug : undefined;
};

export const buildWorkspacePath = (path: string, workspaceSlug?: string) => {
  if (!workspaceSlug) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/w/${workspaceSlug}${normalized}`;
};
