import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { assistantFeature, crmFeature } from "@corely/web-features";
import NotFound from "@corely/web-shared/shared/components/NotFound";
import { CrmShell } from "./CrmShell";
import { RequireAuth } from "./require-auth";
import { OverviewPage } from "../screens/OverviewPage";
import { LoginPage } from "../routes/auth/login";

const featureRoutes = [...assistantFeature.assistantRoutes(), ...crmFeature.crmManifestRoutes()];

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
        <Route element={<CrmShell />}>
          <Route path="/overview" element={<OverviewPage />} />
          {featureRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
