// src/components/layout/AdminLayout.jsx → VERSION FINALE QUI MARCHE À 100%
import React from "react";
import { Outlet } from "react-router-dom";  // ← IMPORTE ÇA
import AdminSidebar from "./AdminSidebar";
import "../../styles/AdminMaster.css";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-content">
          <Outlet />  {/* ← TOUTES LES PAGES ADMIN APPARAÎTRONT ICI */}
        </div>
      </main>
    </div>
  );
}