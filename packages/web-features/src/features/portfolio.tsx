import React from "react";
import {
  ShowcasesPage,
  ShowcaseEditorPage,
  ShowcaseProfilePage,
  ProjectsPage,
  ProjectEditorPage,
  ClientsPage,
  ClientEditorPage,
  ServicesPage,
  ServiceEditorPage,
  TeamPage,
  TeamEditorPage,
} from "@corely/web-features/modules/portfolio";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const portfolioRoutes = (): FeatureRoute[] => [
  { path: "/portfolio/showcases", element: <ShowcasesPage /> },
  { path: "/portfolio/showcases/new", element: <ShowcaseEditorPage /> },
  { path: "/portfolio/showcases/:id/edit", element: <ShowcaseEditorPage /> },
  { path: "/portfolio/showcases/:showcaseId/profile", element: <ShowcaseProfilePage /> },
  { path: "/portfolio/showcases/:showcaseId/projects", element: <ProjectsPage /> },
  { path: "/portfolio/showcases/:showcaseId/projects/new", element: <ProjectEditorPage /> },
  { path: "/portfolio/projects/:id/edit", element: <ProjectEditorPage /> },
  { path: "/portfolio/showcases/:showcaseId/clients", element: <ClientsPage /> },
  { path: "/portfolio/showcases/:showcaseId/clients/new", element: <ClientEditorPage /> },
  { path: "/portfolio/clients/:id/edit", element: <ClientEditorPage /> },
  { path: "/portfolio/showcases/:showcaseId/services", element: <ServicesPage /> },
  { path: "/portfolio/showcases/:showcaseId/services/new", element: <ServiceEditorPage /> },
  { path: "/portfolio/services/:id/edit", element: <ServiceEditorPage /> },
  { path: "/portfolio/showcases/:showcaseId/team", element: <TeamPage /> },
  { path: "/portfolio/showcases/:showcaseId/team/new", element: <TeamEditorPage /> },
  { path: "/portfolio/team/:id/edit", element: <TeamEditorPage /> },
];

export const portfolioNavItems: FeatureNavItem[] = [
  { id: "portfolio", label: "Portfolio", route: "/portfolio/showcases", icon: "Briefcase" },
];
