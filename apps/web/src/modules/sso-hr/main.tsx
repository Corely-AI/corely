import React from "react";
import { createRoot } from "react-dom/client";
import "@corely/web-shared/shared/i18n";
import { HrApp } from "./hr-app";
import "./style.css";
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing HR root element");
}
createRoot(root).render(<HrApp />);
