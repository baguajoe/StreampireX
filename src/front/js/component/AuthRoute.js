import React from "react";
import { Navigate } from "react-router-dom";

const AuthRoute = ({ children, roles = [] }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user")); // Assuming you store user info locally

  if (!token) return <Navigate to="/login" replace />;

  // If roles are defined (e.g., ["admin"]), check if user role matches
  if (roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default AuthRoute;
