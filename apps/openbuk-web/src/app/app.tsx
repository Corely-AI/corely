import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../shared/i18n";
import { Loading } from "../shared/ui";
const Marketing = lazy(() => import("../modules/marketing/marketing-page"));
const Auth = lazy(() => import("../modules/auth/auth-page"));
const Studio = lazy(() => import("../modules/studio/studio-page"));
const Invite = lazy(() => import("../modules/studio/invite-page"));
const Booking = lazy(() => import("../modules/booking/booking-page"));
export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Marketing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/forgot-password" element={<Auth mode="reset" />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/app/*" element={<Studio />} />
            <Route path="/book/:studioSlug" element={<Booking />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  );
}
