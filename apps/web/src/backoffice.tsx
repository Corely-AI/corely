import { InvoiceUiExtensions } from "./modules/invoices/invoice-ui-extensions";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <InvoiceUiExtensions>
    <App />
  </InvoiceUiExtensions>
);
