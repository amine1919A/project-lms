import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { normalizeResponse } from "../../services/api"; // IMPORT CORRIGÉ
import { toast } from "react-toastify";

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cls, setCls] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [availableSpecialties, setAvailableSpecialties] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [classRes, pendingRes, teachersRes, specsRes] = await Promise.all([
        api.get(`classes/classes/${id}/`),
        api.get("accounts/pending/"),
        api.get("accounts/users/?role=teacher"),
        api.get("classes/specialties/")
      ]);
  
      // Utilisez normalizeResponse pour les tableaux
      const currentClass = classRes?.data || null;
      const teachersData = normalizeResponse(teachersRes);
      const specialtiesData = normalizeResponse(specsRes);
      const pendingData = normalizeResponse(pendingRes);
      
      console.log("📊 Données classe:", {
        classe: currentClass,
        enseignants: teachersData?.length || 0,
        specialites: specialtiesData?.length || 0,
        enAttente: pendingData?.length || 0
      });
  
      setCls(currentClass);
      setTeachers(teachersData || []);
      setAllSpecialties(specialtiesData || []);
  
      // Filtrer les étudiants en attente
      const realPendingStudents = (pendingData || [])
        .filter(u => u.role === "student" && u.approved === false);
      setPendingStudents(realPendingStudents);
  
      // Trouver les spécialités disponibles
      if (currentClass && currentClass.subjects) {
        const usedSpecialtyIds = new Set(
          currentClass.subjects.map(sub => sub.specialty).filter(id => id)
        );
  
        const available = (specialtiesData || []).filter(spec =>
          !usedSpecialtyIds.has(spec.id) &&
          (teachersData || []).some(t => t.specialty === spec.name)
        );
  
        setAvailableSpecialties(available);
      }
  
    } catch (err) {
      console.error("Erreur détaillée:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
      toast.error("Erreur lors du chargement des données");
      navigate("/admin/classes");
    } finally {
      setLoading(false);
    }
  };

  // ... le reste du code reste inchangé ...

  const addStudent = async (studentId) => {
    if (!studentId) return;
    try {
      await api.post(`classes/classes/${id}/add-student/`, { user_id: studentId });
      toast.success("Étudiant ajouté et validé !");
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'ajout de l'étudiant");
    }
  };

  const removeStudent = async (studentId) => {
    if (!window.confirm("Retirer cet étudiant de la classe ? Il sera remis en attente.")) return;
    try {
      await api.post(`classes/classes/${id}/remove-student/`, { user_id: studentId });
      toast.success("Étudiant retiré et mis en attente");
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors du retrait");
    }
  };

  const addSubject = async () => {
    if (!selectedSpecialtyId || !selectedTeacherId) {
      return toast.error("Choisissez spécialité et professeur");
    }

    const specialty = allSpecialties.find(s => s.id == selectedSpecialtyId);
    if (!specialty) {
      return toast.error("Spécialité introuvable");
    }

    try {
      // Créer la matière
      await api.post("classes/subjects/", {
        name: specialty.name,
        class_assigned: id,
        specialty: selectedSpecialtyId,
        teacher: selectedTeacherId
      });

      // Valider automatiquement l'enseignant (géré par le backend)
      const teacher = teachers.find(t => t.id == selectedTeacherId);
      if (teacher && !teacher.approved) {
        toast.info(`Enseignant ${teacher.username} validé automatiquement`);
      }

      toast.success(`Matière "${specialty.name}" ajoutée avec succès !`);
      
      // Réinitialiser
      setSelectedSpecialtyId("");
      setSelectedTeacherId("");
      
      // Recharger
      loadAllData();

    } catch (err) {
      console.error("Erreur:", err.response?.data || err);
      toast.error(err.response?.data?.detail || "Erreur lors de l'ajout de la matière");
    }
  };

  const deleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Supprimer la matière "${subjectName}" ?\nL'enseignant sera remis en attente s'il n'enseigne plus ailleurs.`)) return;
    try {
      await api.delete(`classes/subjects/${subjectId}/`);
      toast.success("Matière supprimée");
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const deleteClass = async () => {
    if (!window.confirm(
      `Supprimer définitivement la classe "${cls?.name}" ?\n\n` +
      `⚠️ CONSÉQUENCES:\n` +
      `• Tous les étudiants seront remis en attente\n` +
      `• Les enseignants seront remis en attente s'ils n'enseignent plus ailleurs\n` +
      `• Toutes les matières seront supprimées`
    )) return;
    
    try {
      await api.delete(`classes/classes/${id}/`);
      toast.success("Classe supprimée - Comptes mis à jour automatiquement");
      navigate("/admin/classes");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          color: '#c62828',
          textAlign: 'center'
        }}>
          Chargement des détails de la classe...
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div style={{ padding: "100px", textAlign: "center", fontSize: "1.5rem" }}>
        Classe introuvable
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* EN-TÊTE */}
      <div style={{ 
        margin: "2rem 0", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap", 
        gap: "20px",
        padding: "20px",
        background: "#ffebee",
        borderRadius: "16px",
        boxShadow: "0 8px 25px rgba(198,40,40,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => navigate("/admin/classes")}
            style={{
              background: "none",
              border: "none",
              color: "#c62828",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: 'rgba(198, 40, 40, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(198, 40, 40, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(198, 40, 40, 0.1)';
            }}
          >
            ← Retour aux classes
          </button>

          <h1 style={{ color: "#c62828", fontSize: "2.8rem", margin: 0, fontWeight: "bold" }}>
            {cls.name}
          </h1>
        </div>

        <button
          onClick={deleteClass}
          style={{
            padding: "14px 28px",
            fontSize: "1.1rem",
            fontWeight: "600",
            backgroundColor: "#c62828",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#8e0000";
            e.target.style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#c62828";
            e.target.style.transform = "none";
          }}
        >
          Supprimer la classe
        </button>
      </div>

      {/* MODAL DE CONFIRMATION SUPPRESSION */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{
            maxWidth: "500px",
            padding: "40px",
            borderRadius: "20px",
            background: "white",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(198,40,40,0.4)"
          }}>
            <h2 style={{ color: "#c62828", marginBottom: "20px" }}>
              Supprimer la classe ?
            </h2>
            <p style={{ color: "#555", marginBottom: "30px" }}>
              <strong>"{cls.name}"</strong> sera supprimée définitivement.<br />
              Toutes les données seront perdues.
            </p>
            <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
              <button
                onClick={() => {
                  deleteClass();
                  setShowDeleteModal(false);
                }}
                style={{
                  padding: "16px 36px",
                  backgroundColor: "#c62828",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: 'all 0.3s ease'
                }}
              >
                Oui, supprimer
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "16px 36px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: 'all 0.3s ease'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: "30px",
        marginTop: '30px'
      }}>

        {/* ÉTUDIANTS */}
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          border: "2px solid #ffebee"
        }}>
          <h2 style={{ color: "#c62828", marginBottom: "20px" }}>
            Étudiants ({cls.students?.length || 0}/30)
          </h2>

          {/* Menu déroulant pour ajouter un étudiant */}
          <select
            onChange={(e) => { 
              if (e.target.value) {
                addStudent(e.target.value); 
                e.target.value = ""; 
              }
            }}
            style={{ 
              width: "100%", 
              padding: "16px", 
              margin: "15px 0", 
              borderRadius: "12px", 
              border: "2px solid #c62828", 
              fontSize: "1.1rem",
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            disabled={pendingStudents.length === 0 || cls.students?.length >= 30}
          >
            <option value="">
              {pendingStudents.length === 0 
                ? "Aucun étudiant en attente disponible" 
                : `+ Ajouter un étudiant (${pendingStudents.length} en attente)`}
            </option>
            {pendingStudents.map(s => (
              <option key={s.id} value={s.id}>
                {s.username} → {s.first_name} {s.last_name}
              </option>
            ))}
          </select>

          {/* Liste des étudiants */}
          <div style={{ maxHeight: "500px", overflowY: "auto", marginTop: "20px" }}>
            {cls.students?.length > 0 ? cls.students.map(stu => (
              <div key={stu.id} style={{
                padding: "16px", 
                background: "#ffebee", 
                margin: "12px 0",
                borderRadius: "14px", 
                border: "2px solid #c62828",
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                transition: 'all 0.3s ease'
              }}>
                <div>
                  <strong style={{ color: '#c62828' }}>{stu.username}</strong><br />
                  <span style={{ color: '#555' }}>
                    {stu.first_name} {stu.last_name}
                  </span>
                </div>
                <button
                  onClick={() => removeStudent(stu.id)}
                  style={{
                    background: "#c62828", 
                    color: "white", 
                    border: "none",
                    padding: "10px 18px", 
                    borderRadius: "10px", 
                    cursor: "pointer",
                    fontWeight: "bold", 
                    transition: "0.3s",
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#8e0000"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#c62828"}
                >
                  Retirer
                </button>
              </div>
            )) : (
              <div style={{ 
                textAlign: "center", 
                color: "#999", 
                padding: "40px",
                backgroundColor: '#f9f9f9',
                borderRadius: '12px'
              }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                  Aucun étudiant inscrit
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  Ajoutez des étudiants depuis la liste en attente
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AJOUTER MATIÈRE */}
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          border: "2px solid #ffebee"
        }}>
          <h2 style={{ color: "#c62828", marginBottom: "20px" }}>
            Ajouter une matière
          </h2>

          {/* Sélection spécialité */}
          <select
            value={selectedSpecialtyId}
            onChange={(e) => { 
              setSelectedSpecialtyId(e.target.value); 
              setSelectedTeacherId(""); 
            }}
            style={{ 
              width: "100%", 
              padding: "16px", 
              margin: "15px 0", 
              borderRadius: "12px", 
              border: "2px solid #c62828",
              fontSize: '1.1rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            disabled={availableSpecialties.length === 0}
          >
            <option value="">
              {availableSpecialties.length === 0 
                ? "Toutes les spécialités sont déjà assignées" 
                : "— Choisir la spécialité —"}
            </option>
            {availableSpecialties.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Sélection enseignant */}
          {selectedSpecialtyId && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "16px", 
                margin: "10px 0", 
                borderRadius: "12px", 
                border: "2px solid #c62828",
                fontSize: '1.1rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">— Choisir le professeur —</option>
              {teachers
                .filter(t => t.specialty === allSpecialties.find(s => s.id == selectedSpecialtyId)?.name)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.username} - {t.first_name} {t.last_name} {t.approved ? "✓" : " (en attente)"}
                  </option>
                ))}
            </select>
          )}

          <button
            onClick={addSubject}
            style={{
              width: "100%", 
              marginTop: "20px", 
              padding: "16px",
              backgroundColor: (selectedSpecialtyId && selectedTeacherId) ? "#c62828" : "#cccccc",
              color: "white", 
              border: "none", 
              borderRadius: "12px",
              fontSize: "1.1rem", 
              fontWeight: "600", 
              cursor: (selectedSpecialtyId && selectedTeacherId) ? "pointer" : "not-allowed",
              transition: "all 0.3s ease"
            }}
            disabled={!selectedSpecialtyId || !selectedTeacherId}
          >
            {selectedSpecialtyId && selectedTeacherId 
              ? "Ajouter la matière" 
              : "Sélectionnez spécialité et professeur"}
          </button>
        </div>

        {/* MATIÈRES */}
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          border: "2px solid #ffebee",
          gridColumn: 'span 2'
        }}>
          <h2 style={{ color: "#c62828", marginBottom: "20px" }}>
            Matières ({cls.subjects?.length || 0})
          </h2>
          
          {cls.subjects?.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {cls.subjects.map(sub => (
                <div key={sub.id} style={{
                  padding: "20px", 
                  background: "#fff0f0", 
                  borderRadius: "16px", 
                  border: "2px dashed #c62828", 
                  position: "relative",
                  boxShadow: "0 4px 15px rgba(198,40,40,0.1)",
                  transition: 'all 0.3s ease'
                }}>
                  <button
                    onClick={() => deleteSubject(sub.id, sub.name)}
                    style={{
                      position: "absolute", 
                      top: "12px", 
                      right: "12px",
                      width: "36px", 
                      height: "36px", 
                      borderRadius: "50%",
                      backgroundColor: "#c62828", 
                      color: "white", 
                      border: "none",
                      fontSize: "1.2rem", 
                      fontWeight: "bold", 
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(198,40,40,0.4)",
                      transition: "all 0.3s ease",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#8e0000";
                      e.target.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#c62828";
                      e.target.style.transform = "scale(1)";
                    }}
                    title="Supprimer cette matière"
                  >
                    ×
                  </button>
                  <h3 style={{ 
                    margin: "0 0 10px 0", 
                    color: "#c62828", 
                    paddingRight: "40px", 
                    fontSize: "1.3rem" 
                  }}>
                    {sub.name}
                  </h3>
                  <p style={{ margin: "8px 0", fontWeight: "600", color: '#555' }}>
                    👨‍🏫 Prof: {sub.teacher_name || "Non assigné"}
                  </p>
                  {sub.teacher_username && (
                    <p style={{ margin: "4px 0", fontSize: '0.9rem', color: '#777' }}>
                      ({sub.teacher_username})
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              color: "#999", 
              padding: "60px 20px",
              backgroundColor: '#f9f9f9',
              borderRadius: '12px'
            }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                Aucune matière ajoutée
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Ajoutez des matières à cette classe
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}