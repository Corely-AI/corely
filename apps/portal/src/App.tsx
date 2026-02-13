import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortalDashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./stores/auth";
import { resolveWorkspaceSlug } from "./lib/api-config";

/**
 * Redirect that preserves the /w/:slug prefix from the current URL.
 * Works on F5 refresh because it reads the slug from window.location.
 */
const PortalRedirect = ({ to }: { to: string }) => {
  const slug = resolveWorkspaceSlug();
  const prefix = slug ? `/w/${slug}` : "";
  return <Navigate to={`${prefix}${to}`} replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Workspace-scoped routes */}
      <Route
        path="/w/:slug/login"
        element={!isAuthenticated ? <LoginPage /> : <PortalRedirect to="/" />}
      />
      <Route
        path="/w/:slug/*"
        element={isAuthenticated ? <PortalDashboard /> : <PortalRedirect to="/login" />}
      />
      {/* Bare routes (for ?w=slug query param or env var fallback) */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <PortalRedirect to="/" />} />
      <Route
        path="*"
        element={isAuthenticated ? <PortalDashboard /> : <PortalRedirect to="/login" />}
      />
    </Routes>
  );
};

const App = () => {
  const { isAuthenticated, accessToken, refreshSession } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated && !accessToken) {
        await refreshSession();
      }
      setBooting(false);
    };
    void init();
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
