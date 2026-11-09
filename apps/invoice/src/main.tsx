import "@corely/ui/focused-tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import i18n from "@corely/web-shared/shared/i18n";
import { resolveFocusedLocale } from "@corely/web-shared/session/focused-locale";
import { InvoiceApp } from "./invoice-app";
import "./style.css";
const locale = resolveFocusedLocale(
  localStorage.getItem("Corely One ERP-language"),
  navigator.language
);
void i18n.changeLanguage(locale);
document.documentElement.lang = locale;
document.documentElement.classList.add("corely-focused");
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing Invoice root element");
}
createRoot(root).render(<InvoiceApp />);
