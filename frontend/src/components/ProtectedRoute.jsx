import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="boot-loader">Oturum doğrulanıyor...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

export default ProtectedRoute;
