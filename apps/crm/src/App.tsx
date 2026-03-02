import { Providers } from "@corely/web-shared/providers";
import "@corely/web-shared/shared/i18n";
import { Router } from "./app/router";
import "./index.css";

const App = () => (
  <Providers>
    <Router />
  </Providers>
);

export default App;
