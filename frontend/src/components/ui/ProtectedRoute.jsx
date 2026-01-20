// src/components/ui/ProtectedRoute.jsx → VERSION QUI NE CASSE PLUS RIEN
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Si on est en train de charger → on affiche rien (ou un loader)
  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>Chargement...</div>;
  }

  // Si PAS connecté → redirection vers login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si rôle non autorisé → redirection vers accueil
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Sinon → on affiche la page
  return <>{children}</>;
}