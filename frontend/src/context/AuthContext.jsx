// src/context/AuthContext.jsx - VERSION SIMPLIFIÉE
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification au chargement
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("access_token");
        const userData = localStorage.getItem("user");
        const userRole = localStorage.getItem("user_role");
        
        console.log("🔄 AuthContext - Initialisation:", {
          hasToken: !!token,
          hasUserData: !!userData,
          userRole
        });
        
        if (token && userData && userRole) {
          setUser(JSON.parse(userData));
          console.log("✅ AuthContext - Utilisateur restauré");
        } else {
          console.log("❌ AuthContext - Pas d'authentification");
          setUser(null);
        }
      } catch (error) {
        console.error("AuthContext erreur:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData, tokens) => {
    console.log("🔐 AuthContext - Login:", userData.role);
    
    // Stocker dans localStorage
    localStorage.setItem("access_token", tokens.access);
    if (tokens.refresh) {
      localStorage.setItem("refresh_token", tokens.refresh);
    }
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("user_id", userData.id);
    localStorage.setItem("user_role", userData.role);
    localStorage.setItem("user_email", userData.email);
    localStorage.setItem("user_name", userData.first_name || userData.username || userData.email);
    localStorage.setItem("is_authenticated", "true");
    
    // Mettre à jour l'état
    setUser(userData);
    
    console.log("✅ AuthContext - Connexion réussie");
  };

  const logout = () => {
    console.log("🚪 AuthContext - Logout");
    localStorage.clear();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);