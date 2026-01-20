// src/routes/Router.jsx - VERSION COMPLÈTE CORRIGÉE
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Context Auth
import { useAuth } from "../context/AuthContext";

// Pages publiques
import Home from "../pages/Home/Home";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ResetPassword from "../pages/auth/ResetPassword";

// Layouts
import AdminLayout from "../components/layout/AdminLayout";
import StudentLayout from "../components/layout/StudentLayout";
import TeacherLayout from "../components/layout/TeacherLayout";

// ADMIN PAGES
import AdminDashboard from "../pages/admin/AdminDashboard";
import PendingAccounts from "../pages/admin/PendingAccounts";
import ManageClasses from "../pages/admin/ManageClasses";
import ClassDetails from "../pages/admin/ClassDetails";
import ManageSpecialties from "../pages/admin/ManageSpecialties";
import ManageUsers from "../pages/admin/ManageUsers";
import TeachersManage from "../pages/admin/TeachersManage";
import AdminCourses from "../pages/admin/AdminCourses";
import AdminSchedule from "../pages/admin/AdminSchedule";
import ManageSchedule from "../pages/admin/ManageSchedule";
import AdminNotifications from "../pages/admin/AdminNotifications";
import AdminSettings from "../pages/admin/AdminSettings";

// STUDENT PAGES
import StudentDashboard from "../pages/student/StudentDashboard";
import StudentClassDetails from "../pages/student/StudentClassDetails";
import StudentSubjectDetails from "../pages/student/StudentSubjectDetails";
import StudentCourses from "../pages/student/StudentCourses";
import StudentTests from "../pages/student/StudentTests";
import StudentSchedule from "../pages/student/StudentSchedule";
import StudentChat from "../pages/student/StudentChat";
import StudentLiveSessions from "../pages/student/StudentLiveSessions";
import StudentSubjectChat from "../pages/student/StudentSubjectChat";
import StudentClasses from "../pages/student/StudentClasses";
import StudentResources from "../pages/student/StudentResources";
import TakeTest from "../pages/student/TakeTest";

// TEACHER PAGES
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherSubjectManagement from "../pages/teacher/TeacherSubjectManagement";
import TeacherSchedule from "../pages/teacher/TeacherSchedule";
import UploadCourse from "../pages/teacher/UploadCourse";
import CreateTest from "../pages/teacher/CreateTest";
import GradeTests from "../pages/teacher/GradeTests";
import GradeStudentTest from "../pages/teacher/GradeStudentTest";
import TeacherChat from "../pages/teacher/TeacherChat";
import TeacherLiveSessions from "../pages/teacher/TeacherLiveSessions";
import StartLiveSession from "../pages/teacher/StartLiveSession";

// SHARED
import LiveSessionTeams from "../pages/shared/LiveSessionTeams";

// Protection des routes
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", background: "#f0f2f5", fontSize: "1.5rem", color: "#c62828"
      }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirection auto vers le bon dashboard
    if (user.role === "admin" || user.role === "superadmin") return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
    if (user.role === "student") return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

// Redirection intelligente à la racine "/"
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", background: "#f0f2f5", fontSize: "1.5rem", color: "#c62828"
      }}>
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin" || user.role === "superadmin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === "student") return <Navigate to="/student/dashboard" replace />;
  
  return <Home />;
};

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* ====================== RACINE ====================== */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* ====================== PUBLIQUES ====================== */}
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ====================== ADMIN ====================== */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="pending" element={<PendingAccounts />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="teachers" element={<TeachersManage />} />
          <Route path="classes" element={<ManageClasses />} />
          <Route path="class/:id" element={<ClassDetails />} />
          <Route path="specialties" element={<ManageSpecialties />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="manage-schedule" element={<ManageSchedule />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* ====================== ÉTUDIANT ====================== */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="classes" element={<StudentClasses />} />
          <Route path="class/:id" element={<StudentClassDetails />} />
          <Route path="subject/:id" element={<StudentSubjectDetails />} />
          <Route path="subject-chat/:subjectId" element={<StudentSubjectChat />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="chat" element={<StudentChat />} />
          <Route path="live-sessions" element={<StudentLiveSessions />} />
          <Route path="resources" element={<StudentResources />} />
          <Route path="take-test/:testId" element={<TakeTest />} />
        </Route>

        {/* ====================== ENSEIGNANT ====================== */}
        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="subject/:id" element={<TeacherSubjectManagement />} />
          <Route path="schedule" element={<TeacherSchedule />} />
          <Route path="upload" element={<UploadCourse />} />
          <Route path="create-test" element={<CreateTest />} />
          <Route path="grade-tests" element={<GradeTests />} />
          <Route path="chat" element={<TeacherChat />} />
          <Route path="live-sessions" element={<TeacherLiveSessions />} />
          <Route path="start-live" element={<StartLiveSession />} />
        </Route>

        {/* Route spécifique pour la notation détaillée */}
        <Route
          path="/teacher/tests/:testId/grade/:studentId"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GradeStudentTest />} />
        </Route>

        {/* ====================== PARTAGÉ ====================== */}
        <Route
          path="/live-session-teams/:meetingId"
          element={
            <ProtectedRoute allowedRoles={["student", "teacher"]}>
              <LiveSessionTeams />
            </ProtectedRoute>
          }
        />

        {/* ====================== 404 ====================== */}
        <Route
          path="*"
          element={
            <div style={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "#f8f9fa",
              color: "#c62828",
              fontSize: "2rem",
              textAlign: "center"
            }}>
              <h1>404</h1>
              <p>Page non trouvée</p>
              <a href="/" style={{ marginTop: "2rem", color: "#1976d2", fontSize: "1.2rem" }}>
                Retour à l'accueil
              </a>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}