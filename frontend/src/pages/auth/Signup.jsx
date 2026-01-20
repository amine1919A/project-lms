// src/pages/auth/Signup.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
import Logo from "../../assets/logo.png";
import "../../styles/auth.css";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    first_name: "",
    last_name: "",
    role: "student",
    specialty: "",
  });

  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        // Sauvegarder le token original
        const originalToken = localStorage.getItem("access_token");
        const originalHeaders = { ...api.defaults.headers.common };
        
        // Supprimer le token pour cette requête publique
        delete api.defaults.headers.common["Authorization"];

        let res;
        try {
          res = await api.get("/classes/specialties/");
        } catch {
          res = await api.get("/specialties/");
        }

        const data = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
        setSpecialties(data.length > 0 ? data : [
          { id: 1, name: "Cybersécurité" },
          { id: 2, name: "Intelligence Artificielle" },
          { id: 3, name: "Big Data & Cloud" },
        ]);

        // Restaurer les headers originaux
        api.defaults.headers.common = originalHeaders;
      } catch (err) {
        console.log("Chargement des spécialités échoué, utilisation des valeurs par défaut");
        setSpecialties([
          { id: 1, name: "Cybersécurité" },
          { id: 2, name: "Intelligence Artificielle" },
          { id: 3, name: "Big Data & Cloud" },
        ]);
      }
    };
    loadSpecialties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (form.password !== form.confirmPassword) {
      toast.error("❌ Les mots de passe ne correspondent pas");
      return;
    }
    
    if (form.role === "teacher" && !form.specialty) {
      toast.error("❌ Choisissez une spécialité");
      return;
    }

    if (form.password.length < 8) {
      toast.error("❌ Le mot de passe doit avoir au moins 8 caractères");
      return;
    }

    setLoading(true);
    
    try {
      // Préparer les données d'inscription
      const registerData = {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
      };
      
      // Ajouter la spécialité seulement pour les enseignants
      if (form.role === "teacher") {
        registerData.specialty = parseInt(form.specialty) || form.specialty;
      }
      
      console.log("📤 Inscription avec:", registerData);
      
      const response = await api.post("/accounts/register/", registerData);
      
      console.log("✅ Inscription réussie:", response.data);
      
      toast.success("✅ Compte créé avec succès ! En attente d'approbation par l'administration.", {
        autoClose: 5000,
        position: "top-center"
      });
      
      // Réinitialiser le formulaire
      setForm({
        email: "",
        password: "",
        confirmPassword: "",
        username: "",
        first_name: "",
        last_name: "",
        role: "student",
        specialty: "",
      });
      
      // Redirection après un délai
      setTimeout(() => {
        console.log("🎯 Redirection vers /login");
        window.location.href = "/login"; // Navigation directe
      }, 2000);
      
    } catch (err) {
      console.error("💥 Erreur d'inscription:", err.response?.data || err.message);
      
      let errorMessage = "Erreur lors de l'inscription";
      if (err.response?.data) {
        // Traiter les erreurs de validation Django
        if (err.response.data.email) {
          errorMessage = `Email: ${err.response.data.email[0]}`;
        } else if (err.response.data.username) {
          errorMessage = `Nom d'utilisateur: ${err.response.data.username[0]}`;
        } else if (err.response.data.password) {
          errorMessage = `Mot de passe: ${err.response.data.password[0]}`;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.non_field_errors) {
          errorMessage = err.response.data.non_field_errors[0];
        }
      }
      
      toast.error(`❌ ${errorMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour aller à la page login
  const goToLogin = () => {
    console.log("🔗 Signup → Login");
    window.location.href = "/login"; // Navigation directe
  };

  return (
    <div className="auth-page">
      <div className="auth-card signup-card">
        <img src={Logo} alt="ITEAM University" className="logo-auth" />
        <h1>Inscription</h1>
        <p className="auth-subtitle">Rejoignez ITEAM University</p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label>Email institutionnel *</label>
            <input
              type="email"
              placeholder="prenom.nom@iteam.university"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Nom d'utilisateur *</label>
            <input
              type="text"
              placeholder="profcyber"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prénom *</label>
              <input
                type="text"
                placeholder="Jean"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Nom *</label>
              <input
                type="text"
                placeholder="Dupont"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rôle *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, specialty: "" })}
              disabled={loading}
              required
            >
              <option value="student">Étudiant</option>
              <option value="teacher">Enseignant</option>
            </select>
          </div>

          {form.role === "teacher" && (
            <div className="form-group">
              <label>Spécialité *</label>
              <select
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                required
                disabled={loading}
              >
                <option value="">— Choisir une spécialité —</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Mot de passe *</label>
            <input
              type="password"
              placeholder="•••••••• (minimum 8 caractères)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength="8"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Confirmer le mot de passe *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="submit-btn"
            style={{ 
              width: "100%", 
              padding: "14px", 
              fontSize: "16px",
              marginTop: "10px"
            }}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                &nbsp;Création en cours...
              </>
            ) : "S'inscrire"}
          </button>
        </form>

        <div className="auth-links" style={{ marginTop: "25px" }}>
          <p style={{ fontSize: "15px", marginBottom: "15px" }}>
            Déjà un compte ?{" "}
            <button
              onClick={goToLogin}
              style={{
                background: "none",
                border: "none",
                color: "#d32f2f",
                fontWeight: "bold",
                cursor: "pointer",
                padding: "0 5px",
                fontSize: "15px",
                textDecoration: "underline"
              }}
            >
              Se connecter
            </button>
          </p>
          
          {/* Liens de secours */}
          <div style={{ 
            marginTop: "20px", 
            padding: "15px", 
            background: "#f8f9fa", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
              <strong>Problème de navigation ?</strong>
            </p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <a 
                href="/login" 
                style={{ 
                  color: "#d32f2f", 
                  textDecoration: "underline",
                  fontSize: "14px"
                }}
              >
                Aller à /login
              </a>
              <a 
                href="/" 
                style={{ 
                  color: "#666", 
                  textDecoration: "underline",
                  fontSize: "14px"
                }}
              >
                Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}