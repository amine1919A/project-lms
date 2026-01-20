// src/components/layout/TeacherLayout.jsx - VERSION COMPLÈTE CORRIGÉE
import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import Logo from "../../assets/logo.png";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import QuizIcon from "@mui/icons-material/Quiz";
import GradingIcon from "@mui/icons-material/Grading";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import ChatIcon from "@mui/icons-material/Chat";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SchoolIcon from "@mui/icons-material/School";

export default function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const logout = () => {
    localStorage.clear();
    toast.success("Déconnexion réussie !");
    navigate("/login");
  };

  const menuItems = [
    { 
      path: "/teacher/dashboard", 
      label: "Tableau de bord", 
      icon: <DashboardIcon /> 
    },
    { 
      path: "/teacher/upload", 
      label: "Publier un cours", 
      icon: <UploadFileIcon /> 
    },
    { 
      path: "/teacher/create-test", 
      label: "Créer un test", 
      icon: <QuizIcon /> 
    },
    { 
      path: "/teacher/grade-tests", 
      label: "Noter les copies", 
      icon: <GradingIcon /> 
    },
    { 
      path: "/teacher/schedule", 
      label: "Emploi du temps", 
      icon: <ScheduleIcon /> 
    },
    { 
      path: "/teacher/live-sessions", 
      label: "Sessions Live", 
      icon: <VideoCallIcon /> 
    },
    { 
      path: "/teacher/start-live", 
      label: "Démarrer Live", 
      icon: <VideoCallIcon /> 
    },
    { 
      path: "/teacher/chat", 
      label: "Messagerie", 
      icon: <ChatIcon /> 
    },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5" }}>
      {/* Sidebar */}
      <aside style={{
        width: isOpen ? "280px" : "70px",
        height: "100vh",
        background: "linear-gradient(180deg, #e53935 0%, #c62828 100%)",
        color: "white",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1000,
        transition: "width 0.3s ease",
        boxShadow: "4px 0 20px rgba(229, 57, 53, 0.3)",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          position: "sticky",
          top: 0,
          background: "rgba(229, 57, 53, 0.9)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: isOpen ? "space-between" : "center" }}>
            {isOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img 
                  src={Logo} 
                  alt="ITEAM" 
                  style={{ 
                    height: "40px", 
                    width: "40px",
                    borderRadius: "8px",
                    objectFit: "contain"
                  }} 
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>ITEAM LMS</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", opacity: 0.9 }}>Espace Enseignant</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
            >
              {isOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "20px 10px" }}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  margin: "6px 10px",
                  borderRadius: "12px",
                  color: "white",
                  textDecoration: "none",
                  backgroundColor: active ? "rgba(255,255,255,0.25)" : "transparent",
                  transition: "all 0.3s ease",
                  fontWeight: active ? "600" : "500",
                  border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  if (!active) e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.target.style.backgroundColor = "transparent";
                }}
              >
                {active && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: "4px",
                    background: "white"
                  }} />
                )}
                <span style={{ 
                  fontSize: "1.3rem", 
                  marginRight: isOpen ? "16px" : "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px"
                }}>
                  {item.icon}
                </span>
                {isOpen && (
                  <span style={{ 
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Déconnexion */}
          <div style={{ marginTop: "30px", padding: "0 10px" }}>
            <button 
              onClick={logout} 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isOpen ? "flex-start" : "center",
                padding: "14px 16px",
                margin: "8px 0",
                borderRadius: "12px",
                color: "white",
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "none",
                width: "100%",
                cursor: "pointer",
                transition: "all 0.3s",
                fontWeight: "500"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.2)"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(255,255,255,0.1)"}
            >
              <LogoutIcon style={{ 
                fontSize: "1.3rem", 
                marginRight: isOpen ? "16px" : "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px"
              }} />
              {isOpen && <span>Déconnexion</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: isOpen ? "280px" : "70px",
        padding: "2rem",
        minHeight: "100vh",
        transition: "all 0.3s ease",
        width: "100%",
        background: "#f8f9fa"
      }}>
        <Outlet />
      </main>

      {/* Style pour le scroll */}
      <style>{`
        aside::-webkit-scrollbar {
          width: 5px;
        }
        aside::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
        }
        aside::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}