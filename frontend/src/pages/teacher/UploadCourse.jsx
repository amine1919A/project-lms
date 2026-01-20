// src/pages/teacher/UploadCourse.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function UploadCourse() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    files: []
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await api.get('/classes/subjects/');
      // Filtrer seulement les matières de l'enseignant connecté
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const teacherSubjects = res.data.filter(subject => 
        subject.teacher === user.id
      );
      setSubjects(teacherSubjects);
    } catch (err) {
      toast.error('Erreur chargement matières');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.title) {
      toast.error('Titre et matière requis');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Créer le cours
      const courseRes = await api.post('/courses/courses/', {
        title: formData.title,
        description: formData.description,
        subject: formData.subject
      });

      const courseId = courseRes.data.id;

      // 2. Uploader les fichiers
      for (let i = 0; i < formData.files.length; i++) {
        const file = formData.files[i];
        const formDataFile = new FormData();
        formDataFile.append('course', courseId);
        formDataFile.append('file', file);

        await api.post('/courses/files/', formDataFile, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        });

        // Mettre à jour la progression
        const progress = Math.round(((i + 1) / formData.files.length) * 100);
        setUploadProgress(progress);
      }

      toast.success('Cours publié avec succès !');
      navigate('/teacher/dashboard');

    } catch (err) {
      console.error('Erreur:', err.response?.data || err);
      toast.error('Erreur lors de la publication du cours');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des matières...</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="empty-subjects">
        <div className="empty-icon">📚</div>
        <h2>Aucune matière assignée</h2>
        <p>Vous devez être assigné à une matière pour publier des cours</p>
        <button onClick={() => navigate('/teacher/dashboard')} className="btn-back">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="upload-course-container">
      <div className="upload-header">
        <button onClick={() => navigate('/teacher/dashboard')} className="back-btn">
          ← Retour
        </button>
        <h1>📤 Publier un nouveau cours</h1>
        <p>Partagez des ressources pédagogiques avec vos étudiants</p>
      </div>

      <div className="upload-content">
        <form onSubmit={handleSubmit} className="upload-form">
          {/* Section informations */}
          <div className="form-section">
            <h2>Informations du cours</h2>
            
            <div className="form-group">
              <label>Titre du cours *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Introduction à l'algorithmique"
                required
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label>Matière *</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
                disabled={uploading}
              >
                <option value="">Sélectionnez une matière</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} - {subject.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez le contenu de ce cours..."
                rows="4"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Section fichiers */}
          <div className="form-section">
            <h2>Fichiers à partager</h2>
            
            <div className="file-upload-area">
              <div className="upload-dropzone">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" className="upload-label">
                  <div className="upload-icon">📎</div>
                  <h3>Glissez-déposez vos fichiers ici</h3>
                  <p>ou cliquez pour parcourir</p>
                  <p className="upload-hint">
                    Formats acceptés: PDF, DOC, PPT, ZIP, Images, Vidéos
                  </p>
                </label>
              </div>

              {/* Liste des fichiers */}
              {formData.files.length > 0 && (
                <div className="file-list">
                  <h4>Fichiers sélectionnés ({formData.files.length})</h4>
                  <div className="files-grid">
                    {formData.files.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-icon">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="remove-file-btn"
                          disabled={uploading}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-label">
                Publication en cours... {uploadProgress}%
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-hint">
                Ne quittez pas cette page pendant l'upload
              </p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/teacher/dashboard')}
              className="btn-cancel"
              disabled={uploading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={uploading || !formData.subject || !formData.title}
            >
              {uploading ? 'Publication...' : '📤 Publier le cours'}
            </button>
          </div>
        </form>

        {/* Informations */}
        <div className="upload-info">
          <h3>💡 Conseils pour un bon cours</h3>
          <ul>
            <li>Utilisez un titre clair et descriptif</li>
            <li>Organisez vos fichiers par thème</li>
            <li>Privilégiez les formats compatibles (PDF)</li>
            <li>Limitez la taille des fichiers à 100MB</li>
            <li>Ajoutez une description pour guider les étudiants</li>
          </ul>

          <h3>📊 Statistiques de publication</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">24h</div>
              <div className="stat-label">Délai de modération</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">100MB</div>
              <div className="stat-label">Limite par fichier</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">10</div>
              <div className="stat-label">Fichiers max</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFileIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return '📕';
    case 'doc':
    case 'docx':
      return '📝';
    case 'ppt':
    case 'pptx':
      return '📊';
    case 'xls':
    case 'xlsx':
      return '📈';
    case 'zip':
    case 'rar':
      return '🗜️';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov':
      return '🎬';
    case 'mp3':
    case 'wav':
      return '🎵';
    default:
      return '📄';
  }
}   