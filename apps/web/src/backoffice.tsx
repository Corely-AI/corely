import { CrmUiExtensions } from "./modules/crm/crm-ui-extensions";
import { InvoiceUiExtensions } from "@corely/invoices-ui";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <InvoiceUiExtensions>
    <CrmUiExtensions>
      <App />
    </CrmUiExtensions>
  </InvoiceUiExtensions>
);
