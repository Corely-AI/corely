import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortalDashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./stores/auth";

const App = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={isAuthenticated ? <PortalDashboard /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
