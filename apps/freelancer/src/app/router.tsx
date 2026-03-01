import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  assistantFeature,
  crmFeature,
  expensesFeature,
  invoicesFeature,
  portfolioFeature,
  taxFeature,
} from "@corely/web-features";
import { DashboardPage } from "@corely/web-features/modules/core";
import { PaymentMethodsSettings } from "@corely/web-shared/settings";
import NotFound from "@corely/web-shared/shared/components/NotFound";
import { FreelancerShell } from "./FreelancerShell";
import { RequireAuth } from "./require-auth";
import { SettingsPage } from "../screens/SettingsPage";
import { LoginPage } from "../routes/auth/login";

const featureRoutes = [
  ...assistantFeature.assistantRoutes(),
  ...crmFeature.crmRoutes(),
  ...expensesFeature.expensesRoutes(),
  ...invoicesFeature.invoicesRoutes(),
  ...taxFeature.taxRoutes(),
  ...portfolioFeature.portfolioRoutes(),
];

export const Router = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<Navigate to="/auth/login" replace />} />
      <Route path="/auth/forgot-password" element={<Navigate to="/auth/login" replace />} />
      <Route path="/auth/reset-password" element={<Navigate to="/auth/login" replace />} />

      <Route element={<RequireAuth />}>
        <Route element={<FreelancerShell />}>
          <Route path="/overview" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/payment-methods" element={<PaymentMethodsSettings />} />
          {featureRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
