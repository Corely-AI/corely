import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortalDashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./stores/auth";
import { resolveWorkspaceSlugFromPath } from "./lib/api-config";

/**
 * Redirect that preserves /w/:slug only when it is explicitly present in the URL path.
 * Host-based workspace URLs (e.g. slug.portal.corely.one/login) should stay path-clean.
 */
const PortalRedirect = ({ to }: { to: string }) => {
  const slugFromPath = resolveWorkspaceSlugFromPath();
  const prefix = slugFromPath ? `/w/${slugFromPath}` : "";
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
