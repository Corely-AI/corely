import { Providers } from "@/app/providers";
import { Router } from "@/app/router";

export default function App() {
  return (
    <Providers>
      <Router />
    </Providers>
  );
}
