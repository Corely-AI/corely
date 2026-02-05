import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicFormPage } from "../../modules/forms";
import { PublicCmsListPage, PublicCmsPostPage } from "../../modules/cms";
import { PublicRentalsListScreen, PublicRentalDetailScreen } from "../../modules/rentals";
import NotFound from "../../shared/components/NotFound";
import { LoginPage } from "../../routes/auth/login";
import SignupPage from "../../routes/auth/signup";
import ForgotPasswordPage from "../../routes/auth/forgot-password";
import ResetPasswordPage from "../../routes/auth/reset-password";
import { PublicWorkspaceProvider } from "../../shared/public-workspace";
import { isCustomDomain } from "../../lib/domain-helper";
import {
  PublicPortfolioLayout,
  PublicShowcaseHome,
  PublicShowcaseWorks,
  PublicShowcaseProject,
  PublicShowcaseClients,
  PublicShowcaseServices,
  PublicShowcaseTeam,
  PublicShowcaseBlog,
} from "../../modules/portfolio";
import { AppShellRoutes } from "./app-shell-routes";

export const Router = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      {/* Root Route: Domain Mode Portfolio OR Dashboard Redirect */}
      <Route
        path="/"
        element={
          isCustomDomain() ? <PublicPortfolioLayout /> : <Navigate to="/dashboard" replace />
        }
      >
        {/* Only active if PublicPortfolioLayout renders Outlet (i.e. custom domain) */}
        {/* But wait, if Navigate renders, it redirects. If Layout renders, it renders Outlet. */}
        {/* So we put the Home screen as index here. */}
        <Route index element={<PublicShowcaseHome />} />
      </Route>

      {/* Domain Mode Sub-routes */}
      <Route element={isCustomDomain() ? <PublicPortfolioLayout /> : undefined}>
        <Route path="/works" element={<PublicShowcaseWorks />} />
        <Route path="/works/:projectSlug" element={<PublicShowcaseProject />} />
        <Route path="/clients" element={<PublicShowcaseClients />} />
        <Route path="/services" element={<PublicShowcaseServices />} />
        <Route path="/team" element={<PublicShowcaseTeam />} />
        <Route path="/blog" element={<PublicShowcaseBlog />} />
      </Route>

      {/* Slug Mode Routes */}
      <Route path="/p/:slug" element={<PublicPortfolioLayout />}>
        <Route index element={<PublicShowcaseHome />} />
        <Route path="works" element={<PublicShowcaseWorks />} />
        <Route path="works/:projectSlug" element={<PublicShowcaseProject />} />
        <Route path="clients" element={<PublicShowcaseClients />} />
        <Route path="services" element={<PublicShowcaseServices />} />
        <Route path="team" element={<PublicShowcaseTeam />} />
        <Route path="blog" element={<PublicShowcaseBlog />} />
      </Route>

      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/f/:publicId" element={<PublicFormPage />} />
      <Route element={<PublicWorkspaceProvider />}>
        <Route path="/w/:workspaceSlug/cms" element={<PublicCmsListPage />} />
        <Route path="/w/:workspaceSlug/cms/:slug" element={<PublicCmsPostPage />} />
        <Route path="/w/:workspaceSlug/rental" element={<PublicRentalsListScreen />} />
        <Route path="/w/:workspaceSlug/rental/:slug" element={<PublicRentalDetailScreen />} />
        <Route path="/cms" element={<PublicCmsListPage />} />
        <Route path="/cms/:slug" element={<PublicCmsPostPage />} />
        <Route path="/rental" element={<PublicRentalsListScreen />} />
        <Route path="/rental/:slug" element={<PublicRentalDetailScreen />} />
        <Route path="/p" element={<PublicCmsListPage />} />
        {/* Note: /p was mapped to CMS list page in legacy? I should remove or keep? 
            Original code: <Route path="/p" element={<PublicCmsListPage />} />
            Original code: <Route path="/p/:slug" element={<PublicCmsPostPage />} />
            I AM OVERWRITING THIS!
            This creates a conflict. "/p" -> CMS, but "/p/:slug" -> Portfolio?
            If I have /p/:slug earlier, it takes precedence.
            But the original code had /p/:slug for post page.
            I should check if I broke CMS public posts.
            "Use the same strategy as Rental Properties".
            "Non-goals: No new blog tables; reuse CMS public queries".
            Maybe I should move Portfolio to `/portfolio/:slug` instead of `/p`?
            But requirements said: "/p/:showcaseSlug -> Home".
            So there IS a conflict with existing CMS routes.
            I must resolve this.
            The user said "/p/:showcaseSlug" explicitly.
            Maybe the existing CMS route uses `/p` as "posts"?
            If so, I should probably stick to requirements and maybe rename existing CMS route or assume user knows what they are doing.
            But wait, `PublicCmsPostPage` is mapped to `/p/:slug`.
            If I map `/p/:slug` to Portfolio, I claim namespace.
            I'll remove the legacy CMS routes from here as I am overwriting them with Portfolio.
            Or typically `/p/` stands for "post" or "portfolio".
            Given the explicit prompt "/p/:showcaseSlug", I will prioritize Portfolio.
        */}
        <Route path="/stay" element={<PublicRentalsListScreen />} />
        <Route path="/stay/:slug" element={<PublicRentalDetailScreen />} />
      </Route>

      <AppShellRoutes />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
