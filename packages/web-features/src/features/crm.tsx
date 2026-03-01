import React from "react";
import {
  AccountsPage,
  AccountDetailPage,
  AccountFormPage,
  ContactsPage,
  ContactDetailPage,
  ContactFormPage,
} from "@corely/web-features/modules/crm";
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
