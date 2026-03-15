import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { CashManagementProductKey } from "@corely/contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { AppShell, type AppSidebarProps, type WorkspaceSwitcherMode } from "@corely/web-shared";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { assistantFeature, cashManagementFeature, type FeatureNavItem } from "@corely/web-features";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const cashManagementSwitcherMode: WorkspaceSwitcherMode = "multi";

const cashManagementNavItems: FeatureNavItem[] = [
  ...cashManagementFeature.cashManagementNavItems,
  ...assistantFeature.assistantNavItems,
  { id: "settings", label: "Settings", route: "/settings", icon: "Settings" },
];

const toWorkspaceNavigationItem = (
  item: FeatureNavItem,
  index: number
): WorkspaceNavigationItem => ({
  id: item.id,
  section: "cash-management",
  label: item.label,
  route: item.route,
  icon: item.icon ?? "HelpCircle",
  order: index + 1,
  exact: item.route === "/dashboard",
});

const cashManagementNavigationGroups: WorkspaceNavigationGroup[] = [
  {
    id: "cash-management",
    labelKey: "nav.cashManagement",
    defaultLabel: "Cash Management",
    order: 1,
    items: cashManagementNavItems.map(toWorkspaceNavigationItem),
  },
];

const cashManagementSidebarProps: Omit<AppSidebarProps, "variant" | "collapsed" | "onToggle"> = {
  showPlatformAdminNav: false,
  showWorkspaceTypeBadge: false,
  workspaceSwitcherMode: cashManagementSwitcherMode,
};

export const CashManagementShell = () => {
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const billingQuery = useQuery({
    queryKey: ["billing", "current", CashManagementProductKey],
    queryFn: () => billingApi.getCurrent(CashManagementProductKey),
  });

  const trial = billingQuery.data?.trial;
  const trialMarker = useMemo(
    () => trial?.expiredAt ?? trial?.endsAt ?? "none",
    [trial?.endsAt, trial?.expiredAt]
  );

  useEffect(() => {
    if (typeof window === "undefined" || trial?.status !== "expired") {
      return;
    }

    const modalKey = `cash-management.trial-expired-modal:${trialMarker}`;
    const bannerKey = `cash-management.trial-expired-banner:${trialMarker}`;
    if (!window.sessionStorage.getItem(modalKey)) {
      setExpiryModalOpen(true);
      window.sessionStorage.setItem(modalKey, "seen");
    }
    setBannerDismissed(window.sessionStorage.getItem(bannerKey) === "dismissed");
  }, [trial?.status, trialMarker]);

  const dismissBanner = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        `cash-management.trial-expired-banner:${trialMarker}`,
        "dismissed"
      );
    }
    setBannerDismissed(true);
  };

  return (
    <>
      {trial?.status === "active" ? (
        <div className="fixed inset-x-0 top-0 z-50 px-4 pt-3 lg:left-[17rem] lg:pr-6">
          <Alert
            className={
              trial.isExpiringSoon
                ? "border-amber-500/40 bg-amber-500/10 shadow-lg"
                : "border-emerald-500/35 bg-emerald-500/10 shadow-lg"
            }
          >
            <Sparkles className="h-4 w-4" />
            <AlertTitle>
              {trial.isExpiringSoon
                ? `${trial.daysRemaining} days left in your full-access trial`
                : `Full-access trial active: ${trial.daysRemaining} days remaining`}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                No card required. Choose a paid plan before the trial ends to keep export, AI, and
                multi-location access.
              </span>
              <Button asChild size="sm">
                <Link to="/billing">Open billing</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {trial?.status === "expired" && !bannerDismissed ? (
        <div className="fixed inset-x-0 top-0 z-50 px-4 pt-3 lg:left-[17rem] lg:pr-6">
          <Alert className="border-amber-500/45 bg-amber-500/12 shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Your 30-day trial has ended</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                Your workspace is now on Free. Historical data stays visible, but export, AI, and
                extra locations are locked until you subscribe.
              </span>
              <Button asChild size="sm">
                <Link to="/billing">Choose a plan</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissBanner}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <AppShell
        navigationGroups={cashManagementNavigationGroups}
        sidebarProps={cashManagementSidebarProps}
        includeWorkspaceQuickActions={false}
      />

      <Dialog open={expiryModalOpen} onOpenChange={setExpiryModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Your 30-day full-access trial has ended</DialogTitle>
            <DialogDescription>
              Your workspace now uses the Free plan. Historical data is still available, but export,
              AI, and multi-location features are locked until you subscribe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryModalOpen(false)}>
              Later
            </Button>
            <Button asChild>
              <Link to="/billing" onClick={() => setExpiryModalOpen(false)}>
                Choose a plan
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
