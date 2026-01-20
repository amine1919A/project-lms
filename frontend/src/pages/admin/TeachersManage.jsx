// src/pages/admin/TeachersManage.jsx – VERSION DESIGN ROUGE & BLANC
import React, { useEffect, useState } from "react";
import api, { extractArray } from "../../services/api";
import { toast } from "react-toastify";

export default function TeachersManage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const response = await api.get("/accounts/users/");
        
        // CORRECTION : Extraire les données
        const allUsers = response.data?.results || response.data?.data || response.data || [];
        
        console.log("👨‍🏫 Données enseignants:", {
          totalUsers: Array.isArray(allUsers) ? allUsers.length : "Non-array",
          rawData: response.data
        });
        
        if (!Array.isArray(allUsers)) {
          console.error("❌ allUsers n'est pas un tableau:", allUsers);
          toast.error("Format de données utilisateurs incorrect");
          setTeachers([]);
        } else {
          const approvedTeachers = allUsers.filter(
            user => user.role === "teacher" && user.approved === true
          );
          console.log(`✅ ${approvedTeachers.length} enseignants trouvés`);
          setTeachers(approvedTeachers);
        }
      } catch (error) {
        console.error("❌ Erreur chargement enseignants :", error.response?.data || error);
        toast.error("Impossible de charger les enseignants");
      } finally {
        setLoading(false);
      }
    };

    loadTeachers();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2 style={{ color: "#c0392b" }}>Chargement des enseignants...</h2>
      </div>
    );
  }

  return (
    <div style={{
      padding: "2rem",
      maxWidth: "1150px",
      margin: "0 auto",
    }}>

      {/* ---- HEADER ---- */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ color: "#e74c3c", fontSize: "2.2rem", marginBottom: "0.3rem" }}>
          Gestion des Enseignants ({teachers.length})
        </h1>
        <p style={{ color: "#7f8c8d" }}>Enseignants approuvés et actifs</p>
      </div>

      {/* ---- AUCUN ENSEIGNANT ---- */}
      {teachers.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "3rem",
          background: "white",
          borderRadius: "12px",
          border: "1px solid #eee",
          boxShadow: "0 5px 20px rgba(0,0,0,0.07)",
          maxWidth: "650px",
          margin: "0 auto"
        }}>
          <h2 style={{ color: "#e74c3c" }}>Aucun enseignant approuvé</h2>
          <p style={{ color: "#7f8c8d" }}>
            Les nouveaux enseignants apparaîtront ici après approbation
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {teachers.map(teacher => (
            <div
              key={teacher.id}
              style={{
                background: "white",
                padding: "1.5rem",
                borderRadius: "14px",
                border: "1px solid #eee",
                boxShadow: "0 5px 18px rgba(0,0,0,0.08)",
                transition: "0.3s",
              }}
            >
              {/* Avatar + Infos */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "#e74c3c",
                    color: "white",
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {teacher.username.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 style={{ margin: 0, color: "#2c3e50" }}>
                    {teacher.username}
                  </h3>
                  <p style={{ margin: "3px 0", color: "#7f8c8d" }}>
                    {teacher.email}
                  </p>
                </div>
              </div>

              {/* Détails */}
              <div>
                <p><strong>Spécialité :</strong> {teacher.specialty || "Non définie"}</p>
                <p>
                  <strong>Inscrit le :</strong>{" "}
                  {new Date(teacher.date_joined).toLocaleDateString("fr-FR")}
                </p>
              </div>

              {/* ---- BOUTONS ---- */}
              <div style={{ marginTop: "1rem", display: "flex", gap: "10px" }}>
                <button
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    color: "#e74c3c",
                    border: "2px solid #e74c3c",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "0.25s",
                  }}
                  onMouseOver={e => {
                    e.target.style.background = "#e74c3c";
                    e.target.style.color = "white";
                  }}
                  onMouseOut={e => {
                    e.target.style.background = "white";
                    e.target.style.color = "#e74c3c";
                  }}
                >
                  Voir le profil
                </button>

                <button
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                    color: "white",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "0.25s",
                    boxShadow: "0 4px 12px rgba(231, 76, 60, 0.35)",
                  }}
                  onMouseOver={e => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 14px rgba(231, 76, 60, 0.50)";
                  }}
                  onMouseOut={e => {
                    e.target.style.transform = "translateY(0px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(231, 76, 60, 0.35)";
                  }}
                  onMouseDown={e => {
                    e.target.style.transform = "scale(0.95)";
                  }}
                  onMouseUp={e => {
                    e.target.style.transform = "translateY(-2px)";
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
