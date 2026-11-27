import React, { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";

function AuthEntry({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Once a form opens, let its submit handler retain control of post-auth navigation.
  const [wasAuthenticatedOnEntry] = useState(isAuthenticated);

  return wasAuthenticatedOnEntry ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function GuestOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  const { key } = useLocation();

  return isLoading ? (
    <PageLoadingSkeleton variant="form" className="mx-auto max-w-lg pt-16" />
  ) : (
    <AuthEntry key={key} isAuthenticated={isAuthenticated} />
  );
}
