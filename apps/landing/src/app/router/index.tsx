import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { HomePage } from "@/modules/home";
import { FreelancerPage } from "@/modules/freelancer";
import { CompanyPage } from "@/modules/company";
import { DevelopersPage } from "@/modules/developers";
import { PrivacyPage, TermsPage } from "@/modules/legal";
import { BlogPage } from "@/modules/blog";
import { NotFoundPage } from "@/modules/not-found";
import { ScrollToTop } from "./ScrollToTop";

export const Router = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/freelancer" element={<FreelancerPage />} />
        <Route path="/company" element={<CompanyPage />} />
        <Route path="/developers" element={<DevelopersPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
