import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { extractArray } from "../../services/api";
import { toast } from "react-toastify";

export default function ManageClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(0);
  const [tempClassName, setTempClassName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [classesRes, usersRes, teachersRes, specsRes] = await Promise.all([
        api.get("classes/classes/"),
        api.get("accounts/users/"),
        api.get("accounts/users/?role=teacher"),
        api.get("classes/specialties/")
      ]);
  
      // CORRECTION : Extraire les tableaux
      const classesData = classesRes.data?.results || classesRes.data?.data || classesRes.data || [];
      const usersData = usersRes.data?.results || usersRes.data?.data || usersRes.data || [];
      const teachersData = teachersRes.data?.results || teachersRes.data?.data || teachersRes.data || [];
      const specsData = specsRes.data?.results || specsRes.data?.data || specsRes.data || [];
  
      console.log("📚 Données classes:", {
        classes: Array.isArray(classesData) ? classesData.length : "Non-array",
        users: Array.isArray(usersData) ? usersData.length : "Non-array"
      });
  
      // S'assurer que ce sont des tableaux
      if (!Array.isArray(classesData)) {
        console.error("❌ classesData n'est pas un tableau:", classesData);
        toast.error("Format de données classes incorrect");
        setClasses([]);
      } else {
        setClasses(classesData);
      }

      const enrolledIds = new Set();
      (classesRes.data || []).forEach(cls => {
        cls.students?.forEach(s => enrolledIds.add(s.id));
      });

      const freeStudents = (usersRes.data || [])
        .filter(u => u.role === "student")
        .filter(u => !enrolledIds.has(u.id));

      setAvailableStudents(freeStudents);

      const specsWithTeachers = (specsRes.data || []).filter(spec =>
        teachersRes.data.some(t => t.specialty === spec.name)
      );
      setSpecialties(specsWithTeachers);

    } catch (err) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // NOUVELLE FONCTION : Création COMPLÈTE de la classe
  const createCompleteClass = async () => {
    if (!tempClassName.trim()) {
      toast.error("Nom de classe requis");
      return;
    }

    if (!selectedStudentId) {
      toast.error("Choisissez un étudiant");
      return;
    }

    if (!selectedSpecialtyId || !selectedTeacherId) {
      toast.error("Choisissez spécialité et professeur");
      return;
    }

    try {
      // ÉTAPE 1 : Créer la classe
      const classResponse = await api.post("classes/classes/", {
        name: tempClassName.trim()
      });

      const classId = classResponse.data.id;
      toast.success(`Classe "${tempClassName}" créée !`);

      // ÉTAPE 2 : Ajouter l'étudiant
      await api.post(`classes/classes/${classId}/add-student/`, {
        user_id: Number(selectedStudentId)
      });
      toast.success("Étudiant ajouté et validé !");

      // ÉTAPE 3 : Ajouter la matière
      const specialty = specialties.find(s => s.id == selectedSpecialtyId);
      await api.post("classes/subjects/", {
        name: specialty.name,
        class_assigned: classId,
        specialty: selectedSpecialtyId,
        teacher: selectedTeacherId
      });
      toast.success("Matière ajoutée !");

      // ÉTAPE 4 : Tout est terminé !
      toast.success("Classe créée avec succès !", { autoClose: 3000 });

      // Réinitialiser tout
      setStep(0);
      setTempClassName("");
      setSelectedStudentId("");
      setSelectedSpecialtyId("");
      setSelectedTeacherId("");

      // Recharger les données
      loadAllData();

    } catch (err) {
      console.error("ERREUR COMPLÈTE :", err.response?.data || err);
      
      // En cas d'erreur, essayer de supprimer la classe si elle a été créée
      if (err.response?.status === 400 && err.response.data?.id) {
        try {
          await api.delete(`classes/classes/${err.response.data.id}/`);
          toast.info("Classe partiellement créée a été supprimée");
        } catch (deleteErr) {
          // Ignorer l'erreur de suppression
        }
      }

      toast.error(
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        "Erreur lors de la création de la classe"
      );
    }
  };

  const deleteClass = async (cls) => {
    if (!window.confirm(
      `Supprimer définitivement la classe "${cls.name}" ?\n\n` +
      `⚠️ CONSÉQUENCES:\n` +
      `• Tous les étudiants seront remis en attente\n` +
      `• Les enseignants seront remis en attente s'ils n'enseignent plus ailleurs\n` +
      `• Toutes les matières seront supprimées`
    )) return;

    try {
      await api.delete(`classes/classes/${cls.id}/`);
      toast.success("Classe supprimée - Comptes mis à jour automatiquement");
      loadAllData();
    } catch (err) {
      console.error("Erreur détaillée:", err.response?.data || err);
      toast.error(err.response?.data?.detail || "Impossible de supprimer la classe");
    }
  };

  // Fonction pour annuler la création
  const cancelCreation = () => {
    setStep(0);
    setTempClassName("");
    setSelectedStudentId("");
    setSelectedSpecialtyId("");
    setSelectedTeacherId("");
    toast.info("Création annulée");
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
          Chargement des classes...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="page-header">
        <h1 className="page-title" style={{ color: "#c62828" }}>
          Gestion des Classes
        </h1>

        <button
          onClick={() => setStep(1)}
          className="btn-primary"
          style={{
            padding: "16px 32px",
            fontSize: "1.1rem",
            fontWeight: "700",
            backgroundColor: availableStudents.length > 0 ? "#c62828" : "#cccccc",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: availableStudents.length > 0 ? "pointer" : "not-allowed",
            opacity: availableStudents.length > 0 ? 1 : 0.6,
            transition: "all 0.3s ease"
          }}
          disabled={availableStudents.length === 0}
          title={availableStudents.length === 0 ? "Aucun étudiant disponible" : ""}
        >
          + Créer une Classe
          {availableStudents.length > 0 && ` (${availableStudents.length} étudiants disponibles)`}
        </button>
      </div>

      {/* MODAL DE CRÉATION - ÉTAPE 1 : Nom et étudiant */}
      {step === 1 && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: "#c62828", margin: 0 }}>
                Étape 1/2 : Informations de base
              </h2>
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 'bold'
              }}>
                Étape 1
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Nom de la classe *
              </label>
              <input
                placeholder="Ex: ING1 Cybersécurité 2025"
                value={tempClassName}
                onChange={(e) => setTempClassName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px",
                  marginBottom: "20px",
                  borderRadius: "12px",
                  border: "2px solid #ddd",
                  fontSize: '1.1rem'
                }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Premier étudiant *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "2px solid #c62828",
                  fontSize: '1.1rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">— Choisir un étudiant libre —</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.username} → {s.first_name} {s.last_name} {!s.approved && " (en attente)"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: "25px", display: "flex", gap: "12px", justifyContent: 'flex-end' }}>
              <button
                onClick={cancelCreation}
                style={{
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                Annuler
              </button>

              <button
                onClick={() => {
                  if (!tempClassName.trim()) {
                    toast.error("Nom de classe requis");
                    return;
                  }
                  if (!selectedStudentId) {
                    toast.error("Choisissez un étudiant");
                    return;
                  }
                  setStep(2);
                }}
                style={{
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#c62828",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  opacity: (tempClassName.trim() && selectedStudentId) ? 1 : 0.6
                }}
                disabled={!tempClassName.trim() || !selectedStudentId}
              >
                Suivant → Matière
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRÉATION - ÉTAPE 2 : Matière */}
      {step === 2 && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: "#c62828", margin: 0 }}>
                Étape 2/2 : Première matière
              </h2>
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 'bold'
              }}>
                Étape 2
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
              <p style={{ margin: 0, color: '#555' }}>
                <strong>Récapitulatif :</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#555' }}>
                Classe : <strong>{tempClassName}</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#555' }}>
                Étudiant : <strong>
                  {availableStudents.find(s => s.id == selectedStudentId)?.username || "Non sélectionné"}
                </strong>
              </p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                Spécialité de la matière *
              </label>
              <select
                value={selectedSpecialtyId}
                onChange={(e) => {
                  setSelectedSpecialtyId(e.target.value);
                  setSelectedTeacherId("");
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  marginBottom: "20px",
                  borderRadius: "12px",
                  border: "2px solid #c62828",
                  fontSize: '1.1rem'
                }}
              >
                <option value="">— Choisir spécialité —</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {selectedSpecialtyId && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                    Professeur assigné *
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "2px solid #c62828",
                      fontSize: '1.1rem'
                    }}
                  >
                    <option value="">— Choisir professeur —</option>
                    {teachers
                      .filter(t => t.specialty === specialties.find(s => s.id == selectedSpecialtyId)?.name)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.username} - {t.first_name} {t.last_name} {t.approved ? "✓" : " (en attente)"}
                        </option>
                      ))}
                  </select>
                </>
              )}
            </div>

            <div style={{ marginTop: "25px", display: "flex", gap: "12px", justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                ← Retour
              </button>

              <button
                onClick={cancelCreation}
                style={{
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#ff4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                Annuler tout
              </button>

              <button
                onClick={createCompleteClass}
                style={{
                  padding: "12px 24px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "#c62828",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  opacity: (selectedSpecialtyId && selectedTeacherId) ? 1 : 0.6
                }}
                disabled={!selectedSpecialtyId || !selectedTeacherId}
              >
                Créer la classe complète
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTE DES CLASSES */}
      <div style={{ marginTop: "3rem" }}>
        {classes.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "#999",
            fontSize: "1.3rem",
            backgroundColor: '#f9f9f9',
            borderRadius: '12px'
          }}>
            Aucune classe créée pour le moment
            {availableStudents.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Créer votre première classe
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: "20px"
          }}>
            {classes.map(cls => (
              <div
                key={cls.id}
                onClick={() => navigate(`/admin/class/${cls.id}`)}
                style={{
                  cursor: "pointer",
                  padding: "24px",
                  borderRadius: "16px",
                  background: "white",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
                  border: '2px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.borderColor = '#c62828';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <h3 style={{ color: "#c62828", margin: "0 0 12px 0", fontSize: "1.4rem" }}>
                  {cls.name}
                </h3>
                <p style={{ margin: "8px 0", fontWeight: "600", color: '#555' }}>
                  👨‍🎓 {cls.students?.length || 0}/30 étudiants
                </p>
                <p style={{ margin: "8px 0", fontWeight: "600", color: '#555' }}>
                  📚 {cls.subjects?.length || 0} matière(s)
                </p>
                <p style={{ margin: "8px 0", fontSize: '0.9rem', color: '#777' }}>
                  Cliquez pour gérer les détails
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteClass(cls);
                  }}
                  style={{
                    marginTop: "16px",
                    width: "100%",
                    padding: "12px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    borderRadius: "8px",
                    border: "2px solid #c62828",
                    color: "#c62828",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#c62828";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#c62828";
                  }}
                >
                  Supprimer la classe
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}