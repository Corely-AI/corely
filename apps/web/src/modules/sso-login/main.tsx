import "@corely/ui/focused-tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { LoginPage } from "./login-page";
import "./styles.css";
document.documentElement.classList.add("corely-focused");
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing login root element");
}
createRoot(root).render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
);
