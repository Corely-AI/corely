import { Providers } from "./app/providers";
import { Router } from "./app/router";
import "@corely/web-shared/shared/i18n";

const App = () => (
  <Providers>
    <Router />
  </Providers>
);

export default App;
