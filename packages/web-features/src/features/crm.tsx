import React from "react";
import {
  AccountsPage,
  AccountDetailPage,
  AccountFormPage,
  ContactsPage,
  ContactDetailPage,
  ContactFormPage,
} from "@corely/web-features/modules/crm";
import { crmRoutes as fullCrmRoutes } from "@corely/web-features/modules/crm/routes";
import type { FeatureNavItem, FeatureRoute } from "@corely/web-features/types";

export const crmRoutes = (): FeatureRoute[] => [
  { path: "/clients", element: <AccountsPage /> },
  { path: "/clients/new", element: <AccountFormPage /> },
  { path: "/clients/:id", element: <AccountDetailPage /> },
  { path: "/clients/:id/edit", element: <AccountFormPage /> },
  { path: "/crm/contacts", element: <ContactsPage /> },
  { path: "/crm/contacts/new", element: <ContactFormPage /> },
  { path: "/crm/contacts/:id", element: <ContactDetailPage /> },
  { path: "/crm/contacts/:id/edit", element: <ContactFormPage /> },
];

export const crmNavItems: FeatureNavItem[] = [
  { id: "clients", label: "Clients", route: "/clients", icon: "Users" },
];

// Manifest-aligned CRM app menu entries (services/api/src/modules/crm/crm.manifest.ts)
export const crmManifestNavItems: FeatureNavItem[] = [
  { id: "crm-deals", label: "Deals", route: "/crm/deals", icon: "FolderKanban" },
  { id: "crm-activities", label: "Activities", route: "/crm/activities", icon: "ClipboardList" },
  { id: "crm-sequences", label: "Sequences", route: "/crm/sequences", icon: "Zap" },
];

export const crmManifestRoutes = (): FeatureRoute[] => [...fullCrmRoutes];
