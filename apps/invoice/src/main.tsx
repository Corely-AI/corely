import React from "react";
import { createRoot } from "react-dom/client";
import "@corely/web-shared/shared/i18n";
import { InvoiceApp } from "./invoice-app";
import "./style.css";
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing Invoice root element");
}
createRoot(root).render(<InvoiceApp />);
