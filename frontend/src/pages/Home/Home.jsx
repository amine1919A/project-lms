// src/pages/Home/Home.jsx → VERSION FINALE, SANS BUG, MAGNIFIQUE
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/logo.png";
import "../../styles/auth.css"; // On utilise le même auth.css → cohérence totale

export default function Home() {
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Écran d'animation au démarrage
  if (animate) {
    return (
      <div className="home-logo-animation">
        <img src={Logo} alt="LMS Iteam" className="logo-animate" />
      </div>
    );
  }

  // Page d'accueil finale
  return (
    <div className="auth-page"> {/* Même classe que login/signup → fond identique */}
      <div className="auth-card" style={{ maxWidth: "500px" }}>
        <img src={Logo} alt="LMS Iteam" className="logo-auth" />
        <h1 style={{ color: "#d32f2f", marginBottom: "1rem" }}>
          Bienvenue sur LMS Iteam
        </h1>
        <p style={{ color: "#555", marginBottom: "2rem", fontSize: "1.1rem" }}>
          La plateforme d'apprentissage moderne de l'Université Iteam
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/login"
            style={{
              padding: "0.9rem 2rem",
              backgroundColor: "#d32f2f",
              color: "white",
              borderRadius: "50px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "1.1rem",
              transition: "all 0.3s",
              boxShadow: "0 4px 15px rgba(211, 47, 47, 0.3)"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#b71c1c"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#d32f2f"}
          >
            Se connecter
          </Link>

          <Link
            to="/signup"
            style={{
              padding: "0.9rem 2rem",
              backgroundColor: "transparent",
              color: "#d32f2f",
              border: "2px solid #d32f2f",
              borderRadius: "50px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "1.1rem",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#ffe5e5";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "translateY(0)";
            }}
          >
            S'inscrire
          </Link>
        </div>

        <p style={{ marginTop: "2rem", color: "#777", fontSize: "0.9rem" }}>
          © 2025 LMS Iteam University — Tous droits réservés
        </p>
      </div>
    </div>
  );
}