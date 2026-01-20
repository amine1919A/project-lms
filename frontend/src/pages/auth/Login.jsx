// src/pages/auth/Login.jsx → VERSION ULTIME PRO 2025 – 100% FONCTIONNELLE
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import Logo from "../../assets/logo.png";
import "../../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      // Étape 1 : Connexion
      const loginRes = await api.post("/accounts/login/", {
        email: email.trim(),
        password,
      });

      // Stocker les tokens
      localStorage.setItem("access_token", loginRes.data.access);
      localStorage.setItem("refresh_token", loginRes.data.refresh || "");

      // Étape 2 : Récupérer le profil utilisateur
      const profileRes = await api.get("/accounts/profile/");
      const user = profileRes.data;

      // Stocker les infos utilisateur
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("user_role", user.role);
      localStorage.setItem("user_email", user.email);
      localStorage.setItem("is_authenticated", "true");

      // Message de bienvenue personnalisé
      const name = user.first_name || user.username || "Utilisateur";
      toast.success(`Bienvenue ${name} !`);

      // REDIRECTION EXACTE SELON LE RÔLE
      let redirectPath = "/";

      switch (user.role) {
        case "admin":
        case "superadmin":
          redirectPath = "/admin/dashboard";
          break;
        case "teacher":
          redirectPath = "/teacher/dashboard";
          break;
        case "student":
          redirectPath = "/student/dashboard";
          break;
        default:
          redirectPath = "/";
      }

      // Forcer la navigation (évite les bugs React Router)
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 800);

    } catch (err) {
      console.error("Erreur de connexion:", err);

      // MESSAGES D’ERREUR PRÉCIS
      let errorMsg = "Erreur inconnue";

      if (err.response) {
        const data = err.response.data;

        if (err.response.status === 401) {
          if (data.detail?.includes("No active account")) {
            errorMsg = "Compte désactivé ou en attente d'approbation";
          } else if (data.detail?.includes("credentials")) {
            errorMsg = "Email ou mot de passe incorrect";
          } else {
            errorMsg = data.detail || "Identifiants invalides";
          }
        } else if (err.response.status === 400) {
          errorMsg = "Données invalides. Vérifiez votre email et mot de passe.";
        } else {
          errorMsg = "Erreur serveur. Réessayez plus tard.";
        }
      } else if (err.request) {
        errorMsg = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      }

      toast.error(errorMsg);

      // Nettoyer en cas d’erreur
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={Logo} alt="ITEAM LMS" className="logo-auth" />
        <h1>Connexion</h1>
        <p className="auth-subtitle">Accédez à votre espace sécurisé</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email institutionnel</label>
            <input
              type="email"
              placeholder="prenom.nom@iteam-university.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="Votre mot de passe sécurisé"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "15px", fontSize: "16px", marginTop: "10px" }}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-links" style={{ marginTop: "25px", textAlign: "center" }}>
          <Link to="/reset-password" style={{ color: "#666", fontSize: "14px" }}>
            Mot de passe oublié ?
          </Link>
          <p style={{ marginTop: "15px" }}>
            Nouveau sur la plateforme ?{" "}
            <Link to="/signup" className="link-highlight" style={{ fontWeight: "600" }}>
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}