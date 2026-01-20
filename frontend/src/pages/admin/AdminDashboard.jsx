// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { extractArray } from "../../services/api";
import { toast } from "react-toastify";
import {
  Users,
  BookOpen,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    classes: 0,
    pending: 0,
    activeStudents: 0,
    activeTeachers: 0,
    averageClassSize: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadDashboardData();
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, classesRes, pendingRes, subjectsRes] = await Promise.all([
        api.get("/accounts/users/"),
        api.get("/classes/classes/"),
        api.get("/accounts/pending/"),
        api.get("/classes/subjects/")
      ]);
  
      // CORRECTION : Extraire les tableaux des réponses
      const users = usersRes.data?.results || usersRes.data?.data || usersRes.data || [];
      const classes = classesRes.data?.results || classesRes.data?.data || classesRes.data || [];
      const pending = pendingRes.data?.results || pendingRes.data?.data || pendingRes.data || [];
      const subjects = subjectsRes.data?.results || subjectsRes.data?.data || subjectsRes.data || [];
  
      // S'assurer que ce sont bien des tableaux
      console.log("📊 Données reçues:", {
        users: Array.isArray(users) ? users.length : "Non-array",
        classes: Array.isArray(classes) ? classes.length : "Non-array",
        pending: Array.isArray(pending) ? pending.length : "Non-array",
        subjects: Array.isArray(subjects) ? subjects.length : "Non-array"
      });
  
      if (!Array.isArray(users)) {
        console.error("❌ users n'est pas un tableau:", users);
        toast.error("Format de données utilisateur incorrect");
        return;
      }

      // Calcul des statistiques avancées
      const totalStudents = users.filter(u => u.role === "student" && u.approved).length;
      const totalTeachers = users.filter(u => u.role === "teacher" && u.approved).length;
      const totalClasses = classes.length;
      
      // Étudiants actifs (dans au moins une classe)
      const activeStudents = users.filter(u => 
        u.role === "student" && u.approved && u.enrolled_classes?.length > 0
      ).length;
      
      // Enseignants actifs (enseignant au moins une matière)
      const teacherIds = new Set(subjects.map(s => s.teacher));
      const activeTeachers = users.filter(u => 
        u.role === "teacher" && u.approved && teacherIds.has(u.id)
      ).length;
      
      // Taille moyenne des classes
      const totalStudentsInClasses = classes.reduce((sum, cls) => 
        sum + (cls.students?.length || 0), 0
      );
      const averageClassSize = totalClasses > 0 
        ? Math.round(totalStudentsInClasses / totalClasses * 10) / 10 
        : 0;

      // Récupérer les activités récentes
      const activities = [];
      
      // Dernières classes créées
      classes.slice(0, 3).forEach(cls => {
        activities.push({
          id: `class-${cls.id}`,
          type: 'class',
          title: `Nouvelle classe créée : ${cls.name}`,
          description: `${cls.students?.length || 0} étudiant(s)`,
          timestamp: new Date().toISOString(),
          icon: 'graduation'
        });
      });
      
      // Derniers utilisateurs en attente
      pending.slice(0, 3).forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          title: `${user.first_name} ${user.last_name} en attente`,
          description: user.role === 'student' ? 'Étudiant' : 'Enseignant',
          timestamp: new Date().toISOString(),
          icon: 'user'
        });
      });

      setStats({
        total: users.length,
        students: totalStudents,
        teachers: totalTeachers,
        admins: users.filter(u => u.role.includes("admin")).length,
        classes: totalClasses,
        pending: pending.length,
        activeStudents,
        activeTeachers,
        averageClassSize
      });

      setPendingUsers(pending.slice(0, 5));
      setRecentActivities(activities);
      setLastUpdated(new Date());

    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId, approve = true) => {
    try {
      await api.post(`/accounts/approve/${userId}/`, {
        action: approve ? "approve" : "reject"
      });
      
      toast.success(approve ? "Utilisateur approuvé" : "Utilisateur rejeté");
      loadDashboardData();
      
    } catch (error) {
      toast.error("Erreur lors de l'opération");
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, onClick }) => (
    <div 
      className="stat-card"
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
        border: `2px solid ${color}20`,
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        width: '80px',
        height: '80px',
        background: `${color}10`,
        borderBottomLeftRadius: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '12px'
      }}>
        <Icon size={24} color={color} />
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px'
        }}>
          {title}
        </div>
        
        <div style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#333',
          lineHeight: '1'
        }}>
          {value}
        </div>
        
        {subtitle && (
          <div style={{
            fontSize: '0.9rem',
            color: '#666',
            marginTop: '8px'
          }}>
            {subtitle}
          </div>
        )}
      </div>
      
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem',
          color: trend.value > 0 ? '#10b981' : '#ef4444'
        }}>
          <TrendingUp size={14} />
          <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          <span style={{ color: '#666' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );

  const QuickAction = ({ icon: Icon, title, description, color, onClick }) => (
    <div 
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: `2px solid ${color}20`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(5px)';
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = `${color}20`;
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `${color}10`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={24} color={color} />
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          {description}
        </div>
      </div>
      
      <ChevronRight size={20} color="#999" />
    </div>
  );

  if (loading) {
    return (
      <div className="admin-container">
        <div className="page-header">
          <h1 className="page-title">Tableau de bord</h1>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh'
        }}>
          <div style={{
            fontSize: '1.2rem',
            color: '#666',
            textAlign: 'center'
          }}>
            Chargement des données...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* En-tête avec rafraîchissement */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            Tableau de bord
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            margin: '0'
          }}>
            Vue d'ensemble du système éducatif
          </p>
          {lastUpdated && (
            <div style={{
              fontSize: '0.9rem',
              color: '#888',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={14} />
              Dernière mise à jour : {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        
        <button
          onClick={loadDashboardData}
          style={{
            padding: '12px 24px',
            background: 'white',
            border: '2px solid #c62828',
            color: '#c62828',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#c62828';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#c62828';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Rafraîchir
        </button>
      </div>

      {/* Statistiques principales */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <StatCard
            title="En attente"
            value={stats.pending}
            icon={UserX}
            color="#f59e0b"
            onClick={() => navigate('/admin/users')}
            subtitle={`${pendingUsers.filter(u => u.role === 'student').length} étudiants, ${pendingUsers.filter(u => u.role === 'teacher').length} enseignants`}
          />
          
          <StatCard
            title="Étudiants actifs"
            value={stats.activeStudents}
            icon={Users}
            color="#3b82f6"
            subtitle={`${stats.students} au total`}
            onClick={() => navigate('/admin/users?role=student')}
          />
          
          <StatCard
            title="Enseignants actifs"
            value={stats.activeTeachers}
            icon={GraduationCap}
            color="#10b981"
            subtitle={`${stats.teachers} au total`}
            onClick={() => navigate('/admin/users?role=teacher')}
          />
          
          <StatCard
            title="Classes"
            value={stats.classes}
            icon={BookOpen}
            color="#8b5cf6"
            subtitle={`Moyenne : ${stats.averageClassSize} étudiants`}
            onClick={() => navigate('/admin/classes')}
          />
        </div>
      </div>

      {/* Contenu principal en deux colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '32px',
        alignItems: 'start'
      }}>
        {/* Colonne de gauche : Activités rapides et récentes */}
        <div>
          {/* Actions rapides */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#333',
              marginBottom: '20px'
            }}>
              Actions rapides
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              <QuickAction
                icon={UserCheck}
                title="Gérer les utilisateurs"
                description="Approuver ou rejeter les demandes"
                color="#3b82f6"
                onClick={() => navigate('/admin/users')}
              />
              
              <QuickAction
                icon={BookOpen}
                title="Gérer les classes"
                description="Créer ou modifier des classes"
                color="#8b5cf6"
                onClick={() => navigate('/admin/classes')}
              />
              
              <QuickAction
                icon={Users}
                title="Voir tous les comptes"
                description="Liste complète des utilisateurs"
                color="#10b981"
                onClick={() => navigate('/admin/users?view=all')}
              />
              
              <QuickAction
                icon={AlertCircle}
                title="Voir les alertes"
                description="Problèmes et notifications"
                color="#f59e0b"
                onClick={() => navigate('/admin/alerts')}
              />
            </div>
          </div>

          {/* Activités récentes */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#333',
                margin: 0
              }}>
                Activités récentes
              </h2>
              <button
                onClick={() => navigate('/admin/activities')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c62828',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.9rem'
                }}
              >
                Voir tout <ChevronRight size={16} />
              </button>
            </div>
            
            <div style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div 
                    key={activity.id}
                    style={{
                      padding: '20px',
                      borderBottom: index < recentActivities.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'background 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: activity.type === 'class' ? '#8b5cf620' : '#3b82f620',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {activity.icon === 'graduation' ? (
                        <GraduationCap size={20} color="#8b5cf6" />
                      ) : (
                        <Users size={20} color="#3b82f6" />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {activity.title}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {activity.description}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                        {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  Aucune activité récente
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne de droite : Demandes en attente */}
        <div>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#333',
                margin: 0
              }}>
                Demandes en attente
              </h2>
              <div style={{
                background: '#f59e0b10',
                color: '#f59e0b',
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                {stats.pending}
              </div>
            </div>
            
            {pendingUsers.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {pendingUsers.map((user, index) => (
                  <div 
                    key={user.id}
                    style={{
                      padding: '16px',
                      borderBottom: index < pendingUsers.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#333' }}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        @{user.username} • {user.role === 'student' ? 'Étudiant' : 'Enseignant'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                        Inscrit le {new Date(user.date_joined).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApproveUser(user.id, true)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#10b98110',
                          border: 'none',
                          color: '#10b981',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#10b981';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#10b98110';
                          e.target.style.color = '#10b981';
                        }}
                        title="Approuver"
                      >
                        <CheckCircle size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleApproveUser(user.id, false)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#ef444410',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#ef4444';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#ef444410';
                          e.target.style.color = '#ef4444';
                        }}
                        title="Rejeter"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                <UserCheck size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                  Aucune demande en attente
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Tous les utilisateurs sont approuvés
                </div>
              </div>
            )}
            
            {pendingUsers.length > 0 && (
              <button
                onClick={() => navigate('/admin/users')}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '12px',
                  background: '#c62828',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#8e0000';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#c62828';
                }}
              >
                Voir toutes les demandes
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Statistiques secondaires */}
          <div style={{
            marginTop: '24px',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#333',
              marginBottom: '16px'
            }}>
              Statistiques système
            </h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#666' }}>Administrateurs</span>
                <span style={{ fontWeight: '600', color: '#333' }}>{stats.admins}</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#666' }}>Taux d'activité</span>
                <span style={{ fontWeight: '600', color: '#333' }}>
                  {stats.students > 0 ? Math.round((stats.activeStudents / stats.students) * 100) : 0}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#666' }}>Remplissage moyen</span>
                <span style={{ fontWeight: '600', color: '#333' }}>
                  {Math.round(stats.averageClassSize / 30 * 100)}%
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#666' }}>Total utilisateurs</span>
                <span style={{ fontWeight: '600', color: '#333' }}>{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}