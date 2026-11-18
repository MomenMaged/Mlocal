import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();


  // User is not logged in
  if (!user) {
    return <Navigate to="/login" replace state={{from: location}} />;
  }

  // User is logged in but doesn't have permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // User is authorized
  return children;
}