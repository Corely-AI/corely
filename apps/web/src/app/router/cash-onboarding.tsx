import React from "react";
import { getReturnPath } from "./return-path";
import { useLocation, useNavigate } from "react-router-dom";
import { CASH_MANAGEMENT_JOURNEY } from "@corely/web-features/modules/cash-management/journeys/cash-management-journey";
import { OnboardingShell } from "@corely/web-features/modules/onboarding";

export default function CashOnboarding() {
  const navigate = useNavigate();

  const { state } = useLocation();
  const finish = () => {
    navigate(getReturnPath(state, "/cash/dashboard"), { replace: true });
  };

  return (
    <OnboardingShell
      config={CASH_MANAGEMENT_JOURNEY}
      onCompleted={finish}
      onExit={() => navigate("/cash/registers", { replace: true })}
      onSkip={finish}
    />
  );
}
