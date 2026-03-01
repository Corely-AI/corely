import type React from "react";

export type FeatureNavItem = {
  id: string;
  label: string;
  route: string;
  icon?: string;
};

export type FeatureRoute = {
  path: string;
  element: React.ReactElement;
};
