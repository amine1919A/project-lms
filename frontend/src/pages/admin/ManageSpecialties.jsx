// src/pages/admin/ManageSpecialties.jsx → VERSION FINALE DESIGN PARFAIT + BOUTON SUPPRIMER MAGNIFIQUE
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function ManageSpecialties() {
  const [specialties, setSpecialties] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSpecialties = async () => {
    try {
      const res = await api.get("classes/specialties/");
      const data = Array.isArray(res.data) ? res.data : [];
      setSpecialties(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Erreur chargement spécialités :", err.response || err);
      toast.error("Impossible de charger les spécialités");
      setSpecialties([]);
    }
  };

  useEffect(() => {
    loadSpecialties();
  }, []);

  const addSpecialty = async () => {
    const name = newName.trim();
    if (!name) return toast.error("Nom requis");

    setLoading(true);
    try {
      await api.post("classes/specialties/", { name });
      toast.success(`"${name}" ajoutée !`);
      setNewName("");
      loadSpecialties();
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Tu n'es pas admin ou session expirée");
      } else if (err.response?.data?.name?.[0]?.includes("unique")) {
        toast.error("Cette spécialité existe déjà");
      } else {
        toast.error("Erreur ajout");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSpecialty = async (id, name) => {
    if (!window.confirm(`Supprimer "${name}" définitivement ?`)) return;
    try {
      await api.delete(`classes/specialties/${id}/`);
      toast.success(`"${name}" supprimée`);
      loadSpecialties();
    } catch (err) {
      toast.error("Impossible de supprimer (utilisée par un professeur ?)");
    }
  };

  return (
    <div className="admin-container">
      <div className="page-header">
        <h1 className="page-title" style={{ color: "#c62828" }}>
          Gestion des Spécialités
        </h1>
      </div>

      {/* AJOUT SPÉCIALITÉ */}
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "2.5rem",
        boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        flexWrap: "wrap"
      }}>
        <input
          placeholder="Ex: Cybersécurité, Intelligence Artificielle, Big Data..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addSpecialty()}
          style={{
            padding: "16px 20px",
            width: "420px",
            maxWidth: "100%",
            borderRadius: "12px",
            border: "2px solid #e0e0e0",
            fontSize: "1.1rem",
            outline: "none",
            transition: "all 0.3s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#c62828"}
          onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          disabled={loading}
        />
        <button
          onClick={addSpecialty}
          disabled={loading}
          style={{
            padding: "16px 32px",
            fontSize: "1.1rem",
            fontWeight: "700",
            borderRadius: "12px",
            border: "none",
            color: "white",
            backgroundColor: "#c62828",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 6px 20px rgba(198, 40, 40, 0.4)",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}
          onMouseEnter={(e) => !loading && (e.target.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => !loading && (e.target.style.transform = "none")}
        >
          {loading ? "Ajout..." : "+ Ajouter"}
        </button>
      </div>

      {/* LISTE DES SPÉCIALITÉS */}
      <div className="grid" style={{ gap: "20px" }}>
        {specialties.length === 0 ? (
          <div style={{
            gridColumn: "1/-1",
            textAlign: "center",
            padding: "4rem",
            background: "#f9f9f9",
            borderRadius: "16px",
            color: "#999",
            fontSize: "1.3rem"
          }}>
            Aucune spécialité — ajoute la première !
          </div>
        ) : (
          specialties.map((s) => (
            <div
              key={s.id}
              className="pending-card"
              style={{
                padding: "1.8rem",
                borderRadius: "16px",
                background: "white",
                boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                textAlign: "center",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
            >
              <h3 style={{
                color: "#c62828",
                margin: "0 0 1rem 0",
                fontSize: "1.4rem",
                fontWeight: "bold"
              }}>
                {s.name}
              </h3>

              {/* BOUTON SUPPRIMER — MAINTENANT MAGNIFIQUE, ROUGE, PUISSANT */}
              <button
                onClick={() => deleteSpecialty(s.id, s.name)}
                style={{
                  padding: "14px 28px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  borderRadius: "12px",
                  border: "none",
                  color: "white",
                  backgroundColor: "#c62828",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(198, 40, 40, 0.4)",
                  transition: "all 0.3s ease",
                  textTransform: "uppercase",
                  letterSpacing: "1px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#8e0000";
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 10px 30px rgba(142, 0, 0, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#c62828";
                  e.target.style.transform = "none";
                  e.target.style.boxShadow = "0 6px 20px rgba(198, 40, 40, 0.4)";
                }}
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}