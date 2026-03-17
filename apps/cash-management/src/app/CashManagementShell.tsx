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
import {
  AppShell,
  AppSidebar,
  type AppSidebarProps,
  type WorkspaceSwitcherMode,
} from "@corely/web-shared";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { assistantFeature, cashManagementFeature, type FeatureNavItem } from "@corely/web-features";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@corely/web-shared/shared/lib/utils";

const cashManagementSwitcherMode: WorkspaceSwitcherMode = "multi";

const baseNavItems = [
  ...cashManagementFeature.cashManagementNavItems,
  ...assistantFeature.assistantNavItems,
];

const billingNavItem = baseNavItems.find((item) => item.id === "cash-billing");
const cashManagementNavItems: FeatureNavItem[] = [
  ...baseNavItems.filter((item) => item.id !== "cash-billing"),
  ...(billingNavItem ? [billingNavItem] : []),
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

import { useNavigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@corely/web-features/modules/onboarding";
import logoFull from "@/assets/logo-full.svg";
import logoMark from "@/assets/logo-mark.svg";

export const CashManagementShell = () => {
  const { t } = useTranslation();
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeBannerDismissed, setActiveBannerDismissed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    isLoaded: isOnboardingLoaded,
    progress: onboardingProgress,
    isComplete: isOnboardingComplete,
  } = useOnboarding({
    config: cashManagementFeature.CASH_MANAGEMENT_JOURNEY,
  });

  // Redirect to onboarding if they haven't completed or dismissed it
  useEffect(() => {
    if (
      isOnboardingLoaded &&
      !isOnboardingComplete &&
      !onboardingProgress?.dismissed &&
      !onboardingProgress?.completedAt
    ) {
      if (
        !location.pathname.startsWith("/onboarding") &&
        !location.pathname.startsWith("/assistant") &&
        location.pathname !== "/billing" &&
        location.pathname !== "/settings"
      ) {
        navigate("/onboarding/cash-management");
      }
    }
  }, [
    isOnboardingLoaded,
    isOnboardingComplete,
    onboardingProgress?.dismissed,
    onboardingProgress?.completedAt,
    location.pathname,
    navigate,
  ]);
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

    const activeBannerKey = `cash-management.trial-active-banner:${trialMarker}`;
    setActiveBannerDismissed(window.sessionStorage.getItem(activeBannerKey) === "dismissed");
  }, [trial?.status, trialMarker]);

  const dismissActiveBanner = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        `cash-management.trial-active-banner:${trialMarker}`,
        "dismissed"
      );
    }
    setActiveBannerDismissed(true);
  };

  const dismissBanner = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        `cash-management.trial-expired-banner:${trialMarker}`,
        "dismissed"
      );
    }
    setBannerDismissed(true);
  };

  const trialBanner =
    trial?.status === "active" && !activeBannerDismissed ? (
      <div className="sticky top-0 z-20 pt-3">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
          <Alert
            className={cn(
              "relative flex flex-col gap-1 pr-12",
              trial.isExpiringSoon
                ? "border-amber-500/40 bg-amber-500/10 shadow-lg"
                : "border-emerald-500/35 bg-emerald-500/10 shadow-lg"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <AlertTitle>
              {trial.isExpiringSoon
                ? t("common.trial.expiringTitle", { days: trial.daysRemaining })
                : t("common.trial.activeTitle", { days: trial.daysRemaining })}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{t("common.trial.description")}</span>
              <Button asChild size="sm">
                <Link to="/billing">{t("common.trial.cta")}</Link>
              </Button>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={dismissActiveBanner}
              aria-label={t("common.trial.dismiss")}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      </div>
    ) : trial?.status === "expired" && !bannerDismissed ? (
      <div className="sticky top-0 z-20 pt-3">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
          <Alert className="border-amber-500/45 bg-amber-500/12 shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("common.trial.expiredTitle")}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{t("common.trial.expiredDescription")}</span>
              <Button asChild size="sm">
                <Link to="/billing">{t("common.trial.cta")}</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissBanner}>
                {t("common.trial.dismiss")}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    ) : null;

  return (
    <>
      <AppShell
        navigationGroups={cashManagementNavigationGroups}
        sidebarProps={{
          ...cashManagementSidebarProps,
        }}
        renderSidebar={(props) => (
          <AppSidebar
            {...props}
            logo={
              <div className="flex items-center gap-2">
                <img
                  src={props.collapsed ? logoMark : logoFull}
                  alt="Corely Cash"
                  className={props.collapsed ? "h-8 w-8" : "h-8"}
                />
              </div>
            }
          />
        )}
        includeWorkspaceQuickActions={false}
        topContent={trialBanner}
      />

      <Dialog open={expiryModalOpen} onOpenChange={setExpiryModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("common.trial.modalTitle")}</DialogTitle>
            <DialogDescription>{t("common.trial.modalDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryModalOpen(false)}>
              {t("common.trial.modalLater")}
            </Button>
            <Button asChild>
              <Link to="/billing" onClick={() => setExpiryModalOpen(false)}>
                {t("common.trial.choosePlan")}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
