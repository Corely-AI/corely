import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/app-shell";
import { HomePage } from "@/modules/home";
import {
  PortfolioListPage,
  PortfolioShowcasePage,
  PortfolioProjectPage,
} from "@/modules/portfolio";
import { RentalsListPage, RentalDetailPage } from "@/modules/rentals";
import { BlogListPage, BlogPostPage } from "@/modules/blog";
import { CmsPage } from "@/modules/pages";
import { NotFoundPage } from "@/modules/not-found";
import { ScrollToTop } from "./scroll-to-top";

export const Router = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="portfolio" element={<PortfolioListPage />} />
        <Route path="portfolio/:showcaseSlug" element={<PortfolioShowcasePage />} />
        <Route
          path="portfolio/:showcaseSlug/projects/:projectSlug"
          element={<PortfolioProjectPage />}
        />
        <Route path="rentals" element={<RentalsListPage />} />
        <Route path="rentals/:slug" element={<RentalDetailPage />} />
        <Route path="blog" element={<BlogListPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
        <Route path="pages/:slug" element={<CmsPage />} />

        <Route path="w/:workspaceSlug" element={<HomePage />} />
        <Route path="w/:workspaceSlug/portfolio" element={<PortfolioListPage />} />
        <Route
          path="w/:workspaceSlug/portfolio/:showcaseSlug"
          element={<PortfolioShowcasePage />}
        />
        <Route
          path="w/:workspaceSlug/portfolio/:showcaseSlug/projects/:projectSlug"
          element={<PortfolioProjectPage />}
        />
        <Route path="w/:workspaceSlug/rentals" element={<RentalsListPage />} />
        <Route path="w/:workspaceSlug/rentals/:slug" element={<RentalDetailPage />} />
        <Route path="w/:workspaceSlug/blog" element={<BlogListPage />} />
        <Route path="w/:workspaceSlug/blog/:slug" element={<BlogPostPage />} />
        <Route path="w/:workspaceSlug/pages/:slug" element={<CmsPage />} />

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
