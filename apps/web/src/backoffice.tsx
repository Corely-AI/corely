import { CrmUiExtensions } from "./modules/crm/crm-ui-extensions";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <CrmUiExtensions>
    <App />
  </CrmUiExtensions>
);
