import { Link } from "react-router-dom";
import { Button } from "@corely/ui";
import { Seo } from "@/shared/seo/seo";
import { buildWorkspacePath, useWorkspaceSlug } from "@/shared/lib/workspace";

export function NotFoundPage() {
  const workspaceSlug = useWorkspaceSlug();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Seo
        title="Page Not Found"
        description="The page you requested could not be found."
        noIndex
      />
      <h1 className="text-h1">404</h1>
      <p className="text-body text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link to={buildWorkspacePath("/", workspaceSlug)}>Return home</Link>
      </Button>
    </div>
  );
}
