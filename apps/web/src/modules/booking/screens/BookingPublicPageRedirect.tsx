import { useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Button, Card, CardContent } from "@corely/ui";
import { getPublicBookingUrl } from "@/shared/lib/public-urls";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export default function BookingPublicPageRedirect() {
  const { activeWorkspace, isLoading } = useWorkspace();
  const workspaceSlug = activeWorkspace?.slug?.trim();
  const pageSlug = workspaceSlug || "booking";

  const publicBookingUrl = useMemo(
    () => getPublicBookingUrl(pageSlug, workspaceSlug),
    [pageSlug, workspaceSlug]
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }
    window.location.assign(publicBookingUrl);
  }, [isLoading, publicBookingUrl]);

  return (
    <div className="p-6 lg:p-8">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Opening Booking Page</h1>
          <p className="text-sm text-muted-foreground">
            Redirecting you to the public booking page for this workspace.
          </p>
          <Button asChild variant="outline">
            <a href={publicBookingUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Booking Page
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
