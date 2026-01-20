// src/components/layout/AdminSidebar.jsx → VERSION COMPLÈTE AVEC OUVERTURE/FERMETURE
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Logo from "../../assets/logo.png";

// Icônes Material UI
import EventNoteIcon from "@mui/icons-material/EventNote";
import ScheduleIcon from "@mui/icons-material/Schedule";      // NOUVEAU
import DashboardIcon from "@mui/icons-material/Dashboard";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CategoryIcon from "@mui/icons-material/Category";
import SchoolIcon from "@mui/icons-material/School";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import BookIcon from "@mui/icons-material/Book";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Badge from "@mui/material/Badge";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    gestion: true,
    contenu: true,
    systeme: true
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const logout = () => {
    localStorage.clear();
    toast.success("Déconnexion réussie !");
    navigate("/login");
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuSections = [
    {
      id: "gestion",
      title: "Gestion",
      icon: <DashboardIcon />,
      items: [
        { path: "/admin/dashboard", label: "Tableau de bord", icon: <DashboardIcon /> },
        { path: "/admin/pending", label: "Comptes en attente", icon: <PendingActionsIcon />, badge: 3 },
        { path: "/admin/users", label: "Utilisateurs", icon: <PeopleIcon /> },
        { path: "/admin/teachers", label: "Enseignants", icon: <PersonAddIcon /> },
      ]
    },
    {
      id: "contenu",
      title: "Contenu académique",
      icon: <SchoolIcon />,
      items: [
        { path: "/admin/classes", label: "Classes & Matières", icon: <SchoolIcon /> },
        { path: "/admin/specialties", label: "Spécialités", icon: <CategoryIcon /> },
        { path: "/admin/courses", label: "Cours publiés", icon: <BookIcon /> },
        { path: "/admin/schedule", label: "Créer Emploi du Temps", icon: <EventNoteIcon /> },
        { path: "/admin/manage-schedule", label: "Gérer Emplois du Temps", icon: <ScheduleIcon /> },
      ]
    },
    {
      id: "systeme",
      title: "Système",
      icon: <SettingsIcon />,
      items: [
        { path: "/admin/notifications", label: "Notifications", icon: <NotificationsIcon />, badge: 5 },
        { path: "/admin/settings", label: "Paramètres", icon: <SettingsIcon /> },
      ]
    }
  ];

  const quickActions = [
    { label: "Accueil public", icon: <HomeIcon />, action: () => navigate("/") },
    { label: "Rapports", icon: <DashboardIcon />, action: () => navigate("/admin/reports") },
  ];

  const sidebarWidth = isOpen ? "280px" : "80px";
  const mainContentMargin = isOpen ? "280px" : "80px";

  const SidebarContent = () => (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: 'white',
      borderRight: '1px solid #ffebee',
      boxShadow: '2px 0 15px rgba(198, 40, 40, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* En-tête avec logo et bouton menu */}
      <div style={{
        padding: isOpen ? '24px 20px 20px' : '24px 16px 20px',
        borderBottom: '1px solid #ffebee',
        textAlign: isOpen ? 'center' : 'center',
        position: 'relative'
      }}>
        {isOpen ? (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              padding: '10px',
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '2px solid #ffebee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(198, 40, 40, 0.1)'
            }}>
              <img 
                src={Logo} 
                alt="ITEAM University" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            
            <h2 style={{
              margin: '12px 0 4px',
              fontSize: '1.4rem',
              fontWeight: '700',
              color: '#c62828',
              letterSpacing: '0.5px'
            }}>
              ITEAM LMS
            </h2>
            
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: '#ffebee',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#c62828',
              letterSpacing: '0.5px'
            }}>
              Admin
            </div>
          </>
        ) : (
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto',
            padding: '6px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #ffebee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(198, 40, 40, 0.1)',
            cursor: 'pointer'
          }} onClick={() => setIsOpen(true)}>
            <img 
              src={Logo} 
              alt="ITEAM" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        )}

        {/* Bouton toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: isOpen ? '16px' : 'calc(50% - 15px)',
            top: isOpen ? '24px' : '80px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: '#c62828',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 8px rgba(198, 40, 40, 0.3)',
            transition: 'all 0.3s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(198, 40, 40, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(198, 40, 40, 0.3)';
          }}
        >
          {isOpen ? <ChevronRightIcon style={{ transform: 'rotate(180deg)' }} /> : <ChevronRightIcon />}
        </button>
      </div>

      {/* Contenu du menu */}
      <div style={{
        flex: 1,
        padding: isOpen ? '20px 16px' : '20px 8px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {isOpen ? (
          <>
            {/* Sections du menu */}
            {menuSections.map((section) => (
              <div key={section.id} style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    backgroundColor: expandedSections[section.id] ? '#ffebee' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#c62828' }}>{section.icon}</span>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#c62828',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {section.title}
                    </span>
                  </div>
                  {expandedSections[section.id] ? 
                    <ExpandLessIcon style={{ fontSize: '18px', color: '#c62828' }} /> : 
                    <ExpandMoreIcon style={{ fontSize: '18px', color: '#c62828' }} />
                  }
                </button>

                {expandedSections[section.id] && section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px 12px 44px',
                      marginBottom: '4px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: location.pathname === item.path ? '#c62828' : '#555',
                      backgroundColor: location.pathname === item.path ? '#ffebee' : 'transparent',
                      border: location.pathname === item.path ? '1px solid #c62828' : '1px solid transparent',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (location.pathname !== item.path) {
                        e.currentTarget.style.backgroundColor = '#fff5f5';
                        e.currentTarget.style.borderColor = '#ffcdd2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (location.pathname !== item.path) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {location.pathname === item.path && (
                      <div style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#c62828'
                      }} />
                    )}
                    
                    <span style={{
                      marginRight: '12px',
                      color: location.pathname === item.path ? '#c62828' : '#777',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.icon}
                    </span>
                    
                    <span style={{
                      flex: 1,
                      fontSize: '0.9rem',
                      fontWeight: location.pathname === item.path ? '600' : '500'
                    }}>
                      {item.label}
                    </span>
                    
                    {item.badge && (
                      <Badge 
                        badgeContent={item.badge} 
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#c62828',
                            fontSize: '0.6rem',
                            height: '18px',
                            minWidth: '18px'
                          }
                        }}
                      />
                    )}
                  </Link>
                ))}
              </div>
            ))}

            {/* Actions rapides */}
            <div style={{ margin: '32px 0 24px' }}>
              <div style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#999',
                fontWeight: '600',
                marginBottom: '12px',
                paddingLeft: '16px'
              }}>
                Actions rapides
              </div>
              
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    borderRadius: '10px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: 'transparent',
                    color: '#555',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#c62828';
                    e.currentTarget.style.color = '#c62828';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.color = '#555';
                  }}
                >
                  <span style={{ marginRight: '12px' }}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Version réduite du menu */
          <div style={{ marginTop: '20px' }}>
            {menuSections.map((section) => (
              <div key={section.id} style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#c62828',
                  cursor: 'pointer'
                }} onClick={() => setIsOpen(true)}>
                  {section.icon}
                </div>
                
                {expandedSections[section.id] && section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '12px 0',
                      textDecoration: 'none',
                      color: location.pathname === item.path ? '#c62828' : '#777',
                      position: 'relative'
                    }}
                    title={item.label}
                  >
                    {location.pathname === item.path && (
                      <div style={{
                        position: 'absolute',
                        left: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '3px',
                        height: '20px',
                        backgroundColor: '#c62828',
                        borderRadius: '0 3px 3px 0'
                      }} />
                    )}
                    {item.icon}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Bouton déconnexion */}
        <button 
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            width: '100%',
            padding: isOpen ? '12px 16px' : '12px 0',
            marginTop: 'auto',
            borderRadius: isOpen ? '10px' : '50%',
            border: isOpen ? '1px solid #ffebee' : 'none',
            backgroundColor: '#fff5f5',
            color: '#c62828',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '600'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ffebee';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff5f5';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={!isOpen ? "Déconnexion" : ""}
        >
          <LogoutIcon style={{ 
            marginRight: isOpen ? '12px' : '0',
            fontSize: '20px'
          }} />
          {isOpen && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Pied de page */}
      {isOpen && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #ffebee',
          textAlign: 'center',
          backgroundColor: '#fafafa'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{
              fontSize: '0.75rem',
              color: '#666',
              fontWeight: '500'
            }}>
              Système en ligne
            </span>
          </div>
          
          <small style={{
            fontSize: '0.7rem',
            color: '#888',
            display: 'block'
          }}>
            © 2025 ITEAM
          </small>
        </div>
      )}

      {/* Styles inline */}
      <style jsx="true">{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: #ffebee;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #c62828;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Sidebar */}
      <div
        style={{
          width: sidebarWidth,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          transition: 'width 0.3s ease',
          overflow: 'hidden'
        }}
      >
        <SidebarContent />
      </div>

      {/* Overlay pour mobile */}
      {isMobile && isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: sidebarWidth,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Styles pour le contenu principal */}
      <style jsx="true">{`
        .admin-content-wrapper {
          margin-left: ${mainContentMargin};
          padding: 24px;
          min-height: 100vh;
          background: #f9f9f9;
          transition: margin-left 0.3s ease;
        }
        
        @media (max-width: 1024px) {
          .admin-content-wrapper {
            margin-left: 0;
            padding: 80px 20px 20px 20px;
          }
          
          .mobile-menu-toggle {
            display: block !important;
          }
        }
        
        .mobile-menu-toggle {
          display: none;
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 999;
          background: #c62828;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(198, 40, 40, 0.3);
          transition: all 0.3s ease;
        }
        
        .mobile-menu-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(198, 40, 40, 0.4);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Bouton menu mobile */}
      {isMobile && !isOpen && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            background: '#c62828',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(198, 40, 40, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          <MenuIcon />
        </button>
      )}

      {/* Wrapper pour le contenu principal - À UTILISER DANS VOTRE AdminLayout.jsx */}
      <div className="admin-content-wrapper" id="admin-content-wrapper">
        {/* Le contenu de vos pages sera injecté ici */}
      </div>
    </>
  );
}

