// src/pages/admin/PendingAccounts.jsx — VERSION DESIGN ROUGE & BLANC
import React, { useEffect, useState } from "react";
import api, { extractArray } from "../../services/api";
import { toast } from "react-toastify";

export default function PendingAccounts() {
  const [pending, setPending] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [p, c] = await Promise.all([
        api.get("/accounts/pending/"),
        api.get("/classes/classes/")
      ]);
      
      // CORRECTION : Extraire les données correctement
      const pendingData = p.data?.results || p.data?.data || p.data || [];
      const classesData = c.data?.results || c.data?.data || c.data || [];
      
      // S'assurer que ce sont des tableaux
      if (!Array.isArray(pendingData)) {
        console.error("❌ pendingData n'est pas un tableau:", pendingData);
        toast.error("Format de données en attente incorrect");
        setPending([]);
      } else {
        setPending(pendingData);
      }
      
      if (!Array.isArray(classesData)) {
        console.error("❌ classesData n'est pas un tableau:", classesData);
        toast.error("Format de données classes incorrect");
        setClasses([]);
      } else {
        setClasses(classesData);
      }
    };
    load();
  }, []);

  const approveStudent = async (userId, classId) => {
    if (!classId) return toast.error("Choisis une classe");
    const cls = classes.find(c => c.id === parseInt(classId));
    if (cls.students_count >= 30) return toast.error("Classe pleine !");

    await api.patch(`/accounts/approve/${userId}/`, {
      action: "approve",
      class_id: classId
    });
    toast.success("Étudiant ajouté à " + cls.name);
    setPending(p => p.filter(u => u.id !== userId));
  };

  const approveTeacher = async (userId) => {
    await api.patch(`/accounts/approve/${userId}/`, { action: "approve" });
    toast.success("Enseignant approuvé");
    setPending(p => p.filter(u => u.id !== userId));
  };

  const reject = async (userId) => {
    if (!confirm("Supprimer ce compte ?")) return;
    await api.patch(`/accounts/approve/${userId}/`, { action: "reject" });
    toast.success("Compte refusé");
    setPending(p => p.filter(u => u.id !== userId));
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#e74c3c", fontSize: "2.2rem", marginBottom: "6px" }}>
          Comptes en attente
        </h1>
        <p style={{ color: "#7f8c8d" }}>{pending.length} demande(s)</p>
      </div>

      {/* SI VIDE */}
      {pending.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "white",
            borderRadius: "12px",
            border: "1px solid #eee",
            boxShadow: "0 5px 20px rgba(0,0,0,0.07)",
            maxWidth: "650px",
            margin: "0 auto",
          }}
        >
          <h2 style={{ color: "#e74c3c" }}>Tout est à jour !</h2>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          
          {pending.map(u => (
            <div
              key={u.id}
              style={{
                background: "white",
                padding: "1.5rem",
                borderRadius: "14px",
                border: "1px solid #eee",
                boxShadow: "0 5px 18px rgba(0,0,0,0.08)",
              }}
            >
              {/* Nom + Email */}
              <h3 style={{ margin: 0, color: "#2c3e50" }}>{u.username}</h3>
              <p style={{ margin: "4px 0", color: "#7f8c8d" }}>{u.email}</p>

              {/* Rôle */}
              <strong
                style={{
                  color: u.role === "teacher" ? "#c0392b" : "#e74c3c",
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "1rem",
                }}
              >
                {u.role === "teacher" ? "Enseignant" : "Étudiant"}
              </strong>

              {/* Spécialité si existe */}
              {u.specialty && (
                <p style={{ marginBottom: "10px" }}>
                  Spécialité: <strong>{u.specialty}</strong>
                </p>
              )}

              {/* APPROUVER STUDENT */}
              {u.role === "student" ? (
                <select
                  onChange={(e) => approveStudent(u.id, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "1rem",
                    background: "white",
                    cursor: "pointer",
                    marginBottom: "10px",
                    transition: "0.2s",
                  }}
                >
                  <option value="">Choisir une classe</option>
                  {classes.map(c => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.students_count >= 30}
                    >
                      {c.name} ({c.students_count}/30)
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => approveTeacher(u.id)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#e74c3c",
                    border: "2px solid #e74c3c",
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "0.25s",
                    marginTop: "10px",
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
                  Approuver enseignant
                </button>
              )}

              {/* BOUTON REFUSER */}
              <button
                onClick={() => reject(u.id)}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "0.25s",
                  boxShadow: "0 4px 12px rgba(231, 76, 60, 0.35)",
                  marginTop: "10px",
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
                Refuser
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
