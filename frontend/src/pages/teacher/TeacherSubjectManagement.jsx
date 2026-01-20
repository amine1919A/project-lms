// src/pages/teacher/TeacherSubjectManagement.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api';


export default function TeacherSubjectManagement() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [courses, setCourses] = useState([]);
  const [files, setFiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('courses');
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    files: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSubjectData();
  }, [id]);

  const loadSubjectData = async () => {
    try {
      const [subjectRes, coursesRes, classRes] = await Promise.all([
        api.get(`/classes/subjects/${id}/`),
        api.get('/courses/courses/', { params: { subject: id } }),
        api.get(`/classes/classes/${subjectRes.data.class_assigned}/`)
      ]);

      setSubject(subjectRes.data);
      setCourses(coursesRes.data);
      setStudents(classRes.data.students || []);

      // Récupérer les fichiers
      const allFiles = [];
      for (const course of coursesRes.data) {
        try {
          const filesRes = await api.get('/courses/files/', { params: { course: course.id } });
          allFiles.push(...filesRes.data.map(file => ({ ...file, course_title: course.title })));
        } catch (err) {
          console.error('Erreur fichiers:', err);
        }
      }
      setFiles(allFiles);

    } catch (error) {
      toast.error('Erreur chargement des données');
      navigate('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Créer le cours
      const courseData = {
        title: newCourse.title,
        description: newCourse.description,
        subject: parseInt(id),
        teacher: user.id
      };

      const courseRes = await api.post('/courses/courses/', courseData);

      // Uploader les fichiers
      for (const file of newCourse.files) {
        const formData = new FormData();
        formData.append('course', courseRes.data.id);
        formData.append('file', file);
        formData.append('uploaded_by', user.id);

        await api.post('/courses/files/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Cours publié avec succès !');
      setShowCourseModal(false);
      setNewCourse({ title: '', description: '', files: [] });
      loadSubjectData();
    } catch (error) {
      toast.error('Erreur publication cours');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setNewCourse(prev => ({
      ...prev,
      files: [...prev.files, ...selectedFiles]
    }));
  };

  const removeFile = (index) => {
    setNewCourse(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Supprimer ce cours ?')) return;
    
    try {
      await api.delete(`/courses/courses/${courseId}/`);
      toast.success('Cours supprimé');
      loadSubjectData();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  const startLiveSession = async () => {
    try {
      const response = await api.post('/live/sessions/', {
        title: `Session Live - ${subject.name}`,
        description: 'Session en direct',
        subject: parseInt(id),
        start_time: new Date().toISOString(),
        max_participants: 50
      });

      await api.post(`/live/sessions/${response.data.id}/start/`);
      navigate(`/live-session/${response.data.meeting_id}`);
    } catch (error) {
      toast.error('Erreur démarrage session');
    }
  };

  const createTest = () => {
    navigate(`/teacher/create-test?subject=${id}`);
  };

  if (loading) {
    return (
      <div className="subject-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de la matière...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="subject-not-found">
        <h2>Matière non trouvée</h2>
        <button onClick={() => navigate('/teacher/dashboard')}>
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="subject-management-container">
      {/* Header */}
      <div className="subject-header">
        <button onClick={() => navigate('/teacher/dashboard')} className="back-btn">
          ← Retour
        </button>
        <div className="subject-info">
          <div className="subject-title">
            <h1>{subject.name}</h1>
            <span className="class-code">{subject.class_name}</span>
          </div>
          <div className="subject-meta">
            <span className="meta-item">
              <span className="meta-icon">👨‍🏫</span>
              {subject.teacher_name || user.username}
            </span>
            <span className="meta-item">
              <span className="meta-icon">👥</span>
              {students.length} étudiants
            </span>
            <span className="meta-item">
              <span className="meta-icon">📚</span>
              {courses.length} cours
            </span>
          </div>
        </div>
        <div className="subject-actions">
          <button className="btn-live" onClick={startLiveSession}>
            🎥 Démarrer un live
          </button>
          <button className="btn-test" onClick={createTest}>
            📝 Créer un test
          </button>
          <button className="btn-announce">
            📢 Annonce
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="subject-nav">
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            📚 Cours
          </button>
          <button 
            className={`nav-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            📎 Fichiers
          </button>
          <button 
            className={`nav-tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            👥 Étudiants
          </button>
          <button 
            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => navigate(`/teacher/class/${subject.class_assigned}/chat`)}
          >
            💬 Chat
          </button>
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="subject-content">
        {activeTab === 'courses' && (
          <div className="courses-section">
            <div className="section-header">
              <h2>Cours publiés</h2>
              <button 
                className="btn-add-course"
                onClick={() => setShowCourseModal(true)}
              >
                + Nouveau cours
              </button>
            </div>
            
            {courses.length === 0 ? (
              <div className="empty-courses">
                <div className="empty-icon">📚</div>
                <h3>Aucun cours publié</h3>
                <p>Commencez par publier votre premier cours</p>
                <button 
                  className="btn-add-first"
                  onClick={() => setShowCourseModal(true)}
                >
                  Publier un cours
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {courses.map(course => (
                  <div key={course.id} className="course-card">
                    <div className="course-header">
                      <h3>{course.title}</h3>
                      <div className="course-actions">
                        <button 
                          className="btn-edit"
                          onClick={() => {/* Éditer */}}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteCourse(course.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="course-body">
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <span className="meta">
                          📅 Publié le {new Date(course.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="meta">
                          📎 {files.filter(f => f.course === course.id).length} fichiers
                        </span>
                      </div>
                    </div>
                    <div className="course-footer">
                      <button 
                        className="btn-view-files"
                        onClick={() => setActiveTab('files')}
                      >
                        Voir les fichiers
                      </button>
                      <button className="btn-share">
                        Partager
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="files-section">
            <div className="section-header">
              <h2>Fichiers partagés</h2>
              <div className="file-actions">
                <input
                  type="text"
                  placeholder="🔍 Rechercher un fichier..."
                  className="search-input"
                />
                <button className="btn-upload">
                  📤 Uploader
                </button>
              </div>
            </div>
            
            {files.length === 0 ? (
              <div className="empty-files">
                <div className="empty-icon">📎</div>
                <h3>Aucun fichier partagé</h3>
                <p>Les fichiers apparaîtront après publication de cours</p>
              </div>
            ) : (
              <div className="files-table">
                <div className="table-header">
                  <div className="col-name">Nom</div>
                  <div className="col-course">Cours</div>
                  <div className="col-date">Date</div>
                  <div className="col-size">Taille</div>
                  <div className="col-actions">Actions</div>
                </div>
                <div className="table-body">
                  {files.map(file => (
                    <div key={file.id} className="file-row">
                      <div className="col-name">
                        <div className="file-icon">
                          {getFileIcon(file.file)}
                        </div>
                        <div className="file-info">
                          <div className="file-name">
                            {file.file.split('/').pop()}
                          </div>
                          <div className="file-type">
                            {getFileType(file.file)}
                          </div>
                        </div>
                      </div>
                      <div className="col-course">
                        {file.course_title || 'N/A'}
                      </div>
                      <div className="col-date">
                        {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="col-size">
                        {(file.file_size || 0).toLocaleString()} KB
                      </div>
                      <div className="col-actions">
                        <button 
                          className="btn-download"
                          onClick={() => window.open(`http://localhost:8000${file.file}`, '_blank')}
                        >
                          ⬇️
                        </button>
                        <button className="btn-share">
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <div className="section-header">
              <h2>Liste des étudiants</h2>
              <div className="student-stats">
                <span className="stat">{students.length} étudiants</span>
                <span className="stat">85% présence</span>
                <span className="stat">15.2 moyenne</span>
              </div>
            </div>
            
            <div className="students-table">
              <div className="table-header">
                <div className="col-student">Étudiant</div>
                <div className="col-email">Email</div>
                <div className="col-presence">Présence</div>
                <div className="col-moyenne">Moyenne</div>
                <div className="col-status">Status</div>
              </div>
              <div className="table-body">
                {students.map(student => (
                  <div key={student.id} className="student-row">
                    <div className="col-student">
                      <div className="student-avatar">
                        {student.first_name?.charAt(0) || student.username?.charAt(0)}
                      </div>
                      <div className="student-info">
                        <div className="student-name">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="student-username">
                          @{student.username}
                        </div>
                      </div>
                    </div>
                    <div className="col-email">
                      {student.email}
                    </div>
                    <div className="col-presence">
                      <div className="presence-bar">
                        <div 
                          className="presence-fill"
                          style={{ width: `${Math.random() * 100}%` }}
                        ></div>
                      </div>
                      <span className="presence-percent">
                        {Math.floor(Math.random() * 100)}%
                      </span>
                    </div>
                    <div className="col-moyenne">
                      <span className="grade-badge">
                        {Math.random() * 20 + 10 | 0}/20
                      </span>
                    </div>
                    <div className="col-status">
                      <span className="status active">
                        ● Actif
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📊 Performance générale</h3>
                <div className="stats">
                  <div className="stat-item">
                    <div className="stat-value">15.2</div>
                    <div className="stat-label">Moyenne classe</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">85%</div>
                    <div className="stat-label">Taux présence</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">92%</div>
                    <div className="stat-label">Taux réussite</div>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>📈 Engagement</h3>
                <div className="engagement-chart">
                  {/* Graphique simple */}
                  <div className="chart-bars">
                    {[65, 80, 75, 90, 85, 95].map((height, i) => (
                      <div 
                        key={i}
                        className="chart-bar"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mer</span>
                    <span>Jeu</span>
                    <span>Ven</span>
                    <span>Sam</span>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>📚 Ressources utilisées</h3>
                <div className="resources-list">
                  <div className="resource-item">
                    <span className="resource-name">Cours Python</span>
                    <span className="resource-views">245 vues</span>
                  </div>
                  <div className="resource-item">
                    <span className="resource-name">TD Algorithmique</span>
                    <span className="resource-views">189 vues</span>
                  </div>
                  <div className="resource-item">
                    <span className="resource-name">Quiz DB</span>
                    <span className="resource-views">156 vues</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal nouveau cours */}
      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📤 Publier un nouveau cours</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCourseModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Titre du cours *</label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                    placeholder="Ex: Introduction à la programmation Python"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                    placeholder="Description détaillée du cours..."
                    rows="4"
                  />
                </div>
                
                <div className="form-group">
                  <label>Fichiers à joindre</label>
                  <div className="file-upload-area">
                    <label className="upload-label">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <div className="upload-box">
                        <div className="upload-icon">📎</div>
                        <p>Glissez-déposez vos fichiers ici</p>
                        <p className="upload-hint">ou cliquez pour parcourir</p>
                      </div>
                    </label>
                    
                    {newCourse.files.length > 0 && (
                      <div className="files-list">
                        {newCourse.files.map((file, index) => (
                          <div key={index} className="file-item">
                            <div className="file-icon">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="file-info">
                              <div className="file-name">{file.name}</div>
                              <div className="file-size">
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="remove-file"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCourseModal(false)}
                  disabled={uploading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-publish"
                  disabled={uploading || !newCourse.title}
                >
                  {uploading ? 'Publication...' : 'Publier le cours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fonctions utilitaires
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📕',
    doc: '📝',
    docx: '📝',
    ppt: '📊',
    pptx: '📊',
    xls: '📈',
    xlsx: '📈',
    zip: '🗜️',
    rar: '🗜️',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    mp4: '🎬',
    mp3: '🎵',
    txt: '📄'
  };
  return icons[ext] || '📄';
};

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return ext.toUpperCase();
};