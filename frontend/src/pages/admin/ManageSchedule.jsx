// src/pages/admin/ManageSchedule.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './ManageSchedule.css';

export default function ManageSchedule() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [params, setParams] = useState({
    start_time: '08:30',
    end_time: '16:30',
    lunch_start: '12:00',
    lunch_end: '13:00',
    slot_duration: 90,
    break_duration: 15
  });

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassSchedule(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const res = await api.get('/classes/classes/');
      setClasses(res.data);
    } catch (err) {
      toast.error('Erreur chargement classes');
    }
  };

  const loadClassSchedule = async (classId) => {
    setLoading(true);
    try {
      const res = await api.get(`/schedule/schedules/class_schedule/${classId}/`);
      setSchedule(res.data);
    } catch (err) {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!selectedClass) {
      toast.error('Veuillez sélectionner une classe');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/schedule/schedules/generate/', {
        class_id: parseInt(selectedClass),
        ...params
      });
      
      toast.success(res.data.detail);
      loadClassSchedule(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur génération emploi du temps');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTimeSlot = async () => {
    // Logique pour ajouter manuellement un créneau
    toast.info('Fonctionnalité à implémenter');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const daysOrder = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5
  };

  const groupedSlots = schedule?.time_slots?.reduce((acc, slot) => {
    if (!acc[slot.day]) {
      acc[slot.day] = [];
    }
    acc[slot.day].push(slot);
    return acc;
  }, {}) || {};

  // Trier les jours
  const sortedDays = Object.keys(groupedSlots).sort((a, b) => daysOrder[a] - daysOrder[b]);

  return (
    <div className="manage-schedule">
      <div className="admin-header">
        <h1>📅 Gestion des Emplois du Temps</h1>
        <p>Générez et gérez les emplois du temps des classes</p>
      </div>

      <div className="schedule-container">
        {/* Panneau de contrôle */}
        <div className="control-panel">
          <div className="form-section">
            <h3>1. Sélectionnez une classe</h3>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="form-select"
            >
              <option value="">-- Choisir une classe --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.students_count} étudiants)
                </option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <h3>2. Paramètres de génération</h3>
            <div className="params-grid">
              <div>
                <label>Heure début</label>
                <input
                  type="time"
                  value={params.start_time}
                  onChange={(e) => setParams({...params, start_time: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label>Heure fin</label>
                <input
                  type="time"
                  value={params.end_time}
                  onChange={(e) => setParams({...params, end_time: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label>Début pause déjeuner</label>
                <input
                  type="time"
                  value={params.lunch_start}
                  onChange={(e) => setParams({...params, lunch_start: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label>Fin pause déjeuner</label>
                <input
                  type="time"
                  value={params.lunch_end}
                  onChange={(e) => setParams({...params, lunch_end: e.target.value})}
                  className="form-input"
                />
              </div>
              <div>
                <label>Durée cours (minutes)</label>
                <input
                  type="number"
                  value={params.slot_duration}
                  onChange={(e) => setParams({...params, slot_duration: parseInt(e.target.value)})}
                  className="form-input"
                  min="30"
                  max="180"
                />
              </div>
              <div>
                <label>Durée pause (minutes)</label>
                <input
                  type="number"
                  value={params.break_duration}
                  onChange={(e) => setParams({...params, break_duration: parseInt(e.target.value)})}
                  className="form-input"
                  min="5"
                  max="30"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>3. Actions</h3>
            <div className="action-buttons">
              <button
                onClick={handleGenerateSchedule}
                disabled={!selectedClass || generating}
                className="btn-generate"
              >
                {generating ? 'Génération en cours...' : '🔄 Générer emploi du temps'}
              </button>
              <button
                onClick={handleAddTimeSlot}
                disabled={!selectedClass}
                className="btn-secondary"
              >
                ➕ Ajouter un créneau manuel
              </button>
            </div>
          </div>
        </div>

        {/* Affichage de l'emploi du temps */}
        <div className="schedule-display">
          {loading ? (
            <div className="loading">Chargement...</div>
          ) : schedule ? (
            <div className="schedule-view">
              <div className="schedule-header">
                <h2>Emploi du temps - {schedule.class_name}</h2>
                <span className="schedule-info">
                  Dernière mise à jour: {new Date(schedule.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {sortedDays.length > 0 ? (
                <div className="days-grid">
                  {sortedDays.map(day => (
                    <div key={day} className="day-column">
                      <div className="day-header">
                        <h3>
                          {groupedSlots[day][0]?.day_display || 
                           day === 'Monday' ? 'Lundi' :
                           day === 'Tuesday' ? 'Mardi' :
                           day === 'Wednesday' ? 'Mercredi' :
                           day === 'Thursday' ? 'Jeudi' : 'Vendredi'}
                        </h3>
                      </div>
                      <div className="time-slots">
                        {groupedSlots[day]
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map(slot => (
                            <div key={slot.id} className="time-slot-card">
                              <div className="slot-time">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </div>
                              <div className="slot-subject">
                                <strong>{slot.subject_details?.name}</strong>
                              </div>
                              <div className="slot-details">
                                <span className="slot-teacher">
                                  👨‍🏫 {slot.teacher_details?.username}
                                </span>
                                {slot.classroom && (
                                  <span className="slot-room">
                                    🏫 {slot.classroom}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-schedule">
                  <p>Aucun créneau horaire défini</p>
                  <p>Générez un emploi du temps pour commencer</p>
                </div>
              )}
            </div>
          ) : selectedClass ? (
            <div className="no-schedule">
              <div className="no-schedule-icon">📅</div>
              <h3>Aucun emploi du temps défini</h3>
              <p>Générez un emploi du temps pour la classe sélectionnée</p>
            </div>
          ) : (
            <div className="select-class-prompt">
              <div className="prompt-icon">👉</div>
              <h3>Sélectionnez une classe</h3>
              <p>Choisissez une classe pour afficher ou générer son emploi du temps</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}