import React from "react";
import { createRoot } from "react-dom/client";
import { LoginPage } from "./login-page";
import "./styles.css";
const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing login root element");
}
createRoot(root).render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
);
