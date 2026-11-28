import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import { normalizeHostRoute } from "./shared/brand";
import "./styles.css";
document.title = "OpenBuk — Open-source booking for salons & studios";
normalizeHostRoute();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
