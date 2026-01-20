// src/pages/admin/ManageUsers.jsx → VERSION FINALE 100% SANS ERREUR – TOUT EN ROUGE
import React, { useEffect, useState } from "react";
import api, { extractArray } from "../../services/api";
import { toast } from "react-toastify";

export default function ManageUsers() {
  const [allUsers, setAllUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get("/accounts/users/");
      
      // CORRECTION : Extraire les utilisateurs
      const usersData = res.data?.results || res.data?.data || res.data || [];
      
      console.log("📋 Format des données utilisateurs:", {
        raw: res.data,
        extracted: usersData,
        isArray: Array.isArray(usersData)
      });
      
      if (!Array.isArray(usersData)) {
        console.error("❌ usersData n'est pas un tableau:", usersData);
        toast.error("Format de données utilisateurs incorrect");
        setAllUsers([]);
        setDisplayedUsers([]);
      } else {
        setAllUsers(usersData);
        setDisplayedUsers(usersData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("❌ Erreur détaillée:", err.response?.data || err);
      toast.error("Erreur chargement utilisateurs");
      setLoading(false);
    }
  };

  const applyFilter = (filter) => {
    if (activeFilter === filter) {
      setDisplayedUsers(allUsers);
      setActiveFilter("all");
    } else {
      let filtered = [];
      if (filter === "pending_students") {
        filtered = allUsers.filter(u => u.role === "student" && !u.approved);
      } else if (filter === "approved_students") {
        filtered = allUsers.filter(u => u.role === "student" && u.approved);
      } else if (filter === "pending_teachers") {
        filtered = allUsers.filter(u => u.role === "teacher" && !u.approved);
      } else if (filter === "approved_teachers") {
        filtered = allUsers.filter(u => u.role === "teacher" && u.approved);
      }
      setDisplayedUsers(filtered);
      setActiveFilter(filter);
    }
  };

  if (loading) {
    return <div className="admin-container"><h2>Chargement...</h2></div>;
  }

  // STYLE ROUGE IDENTIQUE POUR TOUS LES BOUTONS
  const buttonStyle = {
    padding: "16px 32px",
    fontSize: "1.1rem",
    fontWeight: "700",
    borderRadius: "14px",
    border: "none",
    color: "white",
    backgroundColor: "#c62828",
    boxShadow: "0 6px 20px rgba(198, 40, 40, 0.4)",
    transition: "all 0.3s ease",
    cursor: "pointer",
    minWidth: "250px",
    textTransform: "uppercase",
    letterSpacing: "1px"
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#8e0000",
    boxShadow: "0 12px 35px rgba(142, 0, 0, 0.6)",
    transform: "translateY(-5px)"
  };

  return (
    <div className="admin-container">
      <div className="page-header">
        <h1 className="page-title" style={{ color: "#c62828" }}>
          Gestion des Utilisateurs
        </h1>
        <p style={{ color: "#d32f2f", fontSize: "1.1rem", margin: "12px 0" }}>
          Total : <strong>{allUsers.length}</strong> comptes • Affichés : <strong>{displayedUsers.length}</strong>
        </p>
      </div>

      {/* 5 BOUTONS ROUGES IDENTIQUES — PARFAITS */}
      <div style={{
        margin: "3rem 0",
        display: "flex",
        flexWrap: "wrap",
        gap: "18px",
        justifyContent: "center",
        padding: "30px 20px",
        background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
        borderRadius: "18px",
        boxShadow: "0 10px 30px rgba(198, 40, 40, 0.15)"
      }}>
        <button
          onClick={() => { setDisplayedUsers(allUsers); setActiveFilter("all"); }}
          style={activeFilter === "all" ? activeButtonStyle : buttonStyle}
          onMouseEnter={(e) => { if (activeFilter !== "all") e.target.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { if (activeFilter !== "all") e.target.style.transform = "none"; }}
        >
          Tous les utilisateurs ({allUsers.length})
        </button>

        <button
          onClick={() => applyFilter("pending_students")}
          style={activeFilter === "pending_students" ? activeButtonStyle : buttonStyle}
          onMouseEnter={(e) => { if (activeFilter !== "pending_students") e.target.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { if (activeFilter !== "pending_students") e.target.style.transform = "none"; }}
        >
          Étudiants en attente ({allUsers.filter(u => u.role === "student" && !u.approved).length})
        </button>

        <button
          onClick={() => applyFilter("approved_students")}
          style={activeFilter === "approved_students" ? activeButtonStyle : buttonStyle}
          onMouseEnter={(e) => { if (activeFilter !== "approved_students") e.target.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { if (activeFilter !== "approved_students") e.target.style.transform = "none"; }}
        >
          Étudiants validés ({allUsers.filter(u => u.role === "student" && u.approved).length})
        </button>

        <button
          onClick={() => applyFilter("pending_teachers")}
          style={activeFilter === "pending_teachers" ? activeButtonStyle : buttonStyle}
          onMouseEnter={(e) => { if (activeFilter !== "pending_teachers") e.target.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { if (activeFilter !== "pending_teachers") e.target.style.transform = "none"; }}
        >
          Professeurs en attente ({allUsers.filter(u => u.role === "teacher" && !u.approved).length})
        </button>

        <button
          onClick={() => applyFilter("approved_teachers")}
          style={activeFilter === "approved_teachers" ? activeButtonStyle : buttonStyle}
          onMouseEnter={(e) => { if (activeFilter !== "approved_teachers") e.target.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { if (activeFilter !== "approved_teachers") e.target.style.transform = "none"; }}
        >
          Professeurs validés ({allUsers.filter(u => u.role === "teacher" && u.approved).length})
        </button>
      </div>

      {/* TABLEAU PARFAIT */}
      <div className="table-container" style={{ overflowX: "auto", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>
        <table className="table">
          <thead style={{ backgroundColor: "#c62828", color: "white" }}>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Nom complet</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Spécialité</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "5rem", color: "#999", fontSize: "1.3rem" }}>
                  Aucun utilisateur dans cette catégorie
                </td>
              </tr>
            ) : (
              displayedUsers.map(u => (
                <tr key={u.id} style={{
                  backgroundColor:
                    u.role === "student" && !u.approved ? "#ffebee" :
                    u.role === "student" && u.approved ? "#e8f5e8" :
                    u.role === "teacher" && !u.approved ? "#fff3e0" :
                    "#e3f2fd"
                }}>
                  <td><strong>{u.id}</strong></td>
                  <td>{u.username}</td>
                  <td>{u.first_name} {u.last_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{
                      padding: "6px 14px",
                      borderRadius: "30px",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      color: "white",
                      backgroundColor: u.role === "superadmin" ? "#8e0000" : "#c62828"
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: u.approved ? "#27ae60" : "#c62828", fontWeight: "bold" }}>
                      {u.approved ? "Validé" : "En attente"}
                    </span>
                  </td>
                  <td>{u.specialty || "-"}</td>
                  <td>{new Date(u.date_joined).toLocaleDateString("fr-DZ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}