// src/pages/auth/ResetPassword.jsx → VERSION 100% SANS ERREUR
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/logo.png";        // ← VIRGULE ICI
import "../../styles/auth.css";                 // ← VIRGULE ICI

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setTimeout(() => {
      setMessage("Un lien de réinitialisation a été envoyé à " + email);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={Logo} alt="ITEAM LMS" className="logo-auth" />
        <h1>Réinitialiser le mot de passe</h1>
        <p className="auth-subtitle">Entrez votre email pour recevoir le lien</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@iteam.university"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Envoi en cours..." : "Envoyer le lien"}
          </button>
        </form>

        {message && (
          <p style={{ color: "#27ae60", marginTop: "20px", fontWeight: "600" }}>
            {message}
          </p>
        )}

        <div className="auth-links" style={{ marginTop: "20px" }}>
          <Link to="/login" className="link-highlight">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}