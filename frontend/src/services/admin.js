// src/services/admin.js → VERSION FINALE 100% COMPATIBLE
import api from "./api";

// === STATISTIQUES DASHBOARD ===
export const getAdminStats = async () => {
  try {
    const [users, classes, subjects, pending] = await Promise.all([
      api.get("/accounts/users/"),
      api.get("/classes/classes/"),
      api.get("/classes/subjects/"),
      api.get("/accounts/pending/")
    ]);

    return {
      totalUsers: users.data.length,
      students: users.data.filter(u => u.role === "student" && u.approved).length,
      teachers: users.data.filter(u => u.role === "teacher" && u.approved).length,
      pending: pending.data.length,
      classes: classes.data.length,
      subjects: subjects.data.length,
    };
  } catch (err) {
    console.error("Erreur stats:", err);
    return { totalUsers: 0, students: 0, teachers: 0, pending: 0, classes: 0, subjects: 0 };
  }
};

// === UTILISATEURS ===
export const getAllUsers = () => api.get("/accounts/users/");
export const getPendingUsers = () => api.get("/accounts/pending/");

// === APPROUVER / REJETER ===
export const approveUser = (id, payload) => api.patch(`/accounts/approve/${id}/`, payload);

// === CLASSES ===
export const getAllClasses = () => api.get("/classes/classes/");
export const createClass = (name) => api.post("/classes/classes/", { name, max_students: 30 });

// === MATIÈRES ===
export const getAllSubjects = () => api.get("/classes/subjects/");
export const createSubject = (data) => api.post("/classes/subjects/", data);

// === SPÉCIALITÉS ===
export const getSpecialties = () => api.get("/specialties/");
export const createSpecialty = (name) => api.post("/specialties/", { name });

// === ENSEIGNANTS ===
export const getTeachers = () => 
  api.get("/accounts/users/").then(r => 
    r.data.filter(u => u.role === "teacher" && u.approved)
  );

// === NOTIFICATIONS (mock si pas encore fait) ===
export const getNotifications = async () => {
  try {
    const res = await api.get("/notifications/notifications/");
    return res.data;
  } catch {
    return [
      { id: 1, message: "3 comptes en attente", created_at: new Date().toISOString() },
      { id: 2, message: "Nouvelle classe créée", created_at: new Date().toISOString() },
    ];
  }
};