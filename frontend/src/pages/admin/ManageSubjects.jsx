// src/pages/admin/ManageSubjects.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ name: "", class_id: "" });

  useEffect(() => {
    Promise.all([
      api.get("/classes/subjects/"),
      api.get("/classes/classes/")
    ]).then(([s, c]) => {
      setSubjects(s.data);
      setClasses(c.data);
    });
  }, []);

  const createSubject = async () => {
    if (!form.name || !form.class_id) return toast.error("Tous les champs requis");
    await api.post("/classes/subjects/", { name: form.name, class_assigned: form.class_id });
    toast.success("Matière créée !");
    setForm({ name: "", class_id: "" });
    api.get("/classes/subjects/").then(res => setSubjects(res.data));
  };

  return (
    <div className="admin-container">
      <h1>Gestion des Matières</h1>

      <div className="create-section">
        <h2>Ajouter une matière</h2>
        <input placeholder="Nom de la matière (ex: Algorithmique)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})}>
          <option value="">Choisir une classe</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={createSubject} className="btn-primary">Créer matière</button>
      </div>

      <div className="subjects-list">
        <h2>Toutes les matières</h2>
        <div className="grid">
          {subjects.map(s => (
            <div key={s.id} className="subject-card">
              <h3>{s.name}</h3>
              <p><strong>Classe :</strong> {s.class_assigned?.name}</p>
              <p><strong>Enseignant :</strong> {s.teacher ? s.teacher.username : "Non assigné"}</p>
              <span className={`status ${s.teacher ? "assigned" : "free"}`}>
                {s.teacher ? "Assigné" : "Libre"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}