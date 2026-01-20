// src/pages/admin/AdminSettings.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: "ITEAM LMS",
    maxClassSize: 30,
    autoApproveTeachers: false,
    emailNotifications: true,
    maintenanceMode: false,
    theme: "red"
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simuler une sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Paramètres sauvegardés avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ 
        marginBottom: "2.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "2px solid #ffebee"
      }}>
        <h1 style={{ 
          color: "#c62828", 
          fontSize: "2.5rem", 
          margin: "0 0 0.5rem 0",
          fontWeight: "bold"
        }}>
          ⚙️ Paramètres Système
        </h1>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          Configurez les paramètres généraux de la plateforme
        </p>
      </div>

      {/* Statistiques système */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "1.5rem",
        marginBottom: "2.5rem"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #ff5252 0%, #c62828 100%)",
          color: "white",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 8px 25px rgba(198, 40, 40, 0.3)"
        }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", opacity: 0.9 }}>
            Version
          </h3>
          <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold" }}>
            v2.5.1
          </p>
        </div>

        <div style={{
          background: "white",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "2px solid #ffebee",
          boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
        }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#666" }}>
            Status
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#4CAF50",
              animation: "pulse 2s infinite"
            }} />
            <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: "bold", color: "#333" }}>
              En ligne
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire des paramètres */}
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        marginBottom: "2rem"
      }}>
        <h2 style={{ 
          color: "#c62828", 
          margin: "0 0 1.5rem 0",
          fontSize: "1.8rem"
        }}>
          Configuration générale
        </h2>

        {/* Nom de la plateforme */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "600",
            color: "#333"
          }}>
            Nom de la plateforme
          </label>
          <input
            type="text"
            value={settings.platformName}
            onChange={(e) => setSettings({...settings, platformName: e.target.value})}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "2px solid #e0e0e0",
              fontSize: "1rem",
              transition: "border-color 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#c62828"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          />
        </div>

        {/* Taille maximale des classes */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "600",
            color: "#333"
          }}>
            Taille maximale des classes
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <input
              type="range"
              min="10"
              max="50"
              value={settings.maxClassSize}
              onChange={(e) => setSettings({...settings, maxClassSize: parseInt(e.target.value)})}
              style={{ flex: 1 }}
            />
            <span style={{
              padding: "0.5rem 1rem",
              background: "#ffebee",
              borderRadius: "6px",
              fontWeight: "bold",
              color: "#c62828",
              minWidth: "60px",
              textAlign: "center"
            }}>
              {settings.maxClassSize}
            </span>
          </div>
        </div>

        {/* Options */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            padding: "1rem",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{ fontWeight: "600", color: "#333", marginBottom: "0.25rem" }}>
                Approuver automatiquement les enseignants
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                Les nouveaux enseignants sont automatiquement approuvés
              </div>
            </div>
            <label style={{ position: "relative", display: "inline-block" }}>
              <input
                type="checkbox"
                checked={settings.autoApproveTeachers}
                onChange={(e) => setSettings({...settings, autoApproveTeachers: e.target.checked})}
                style={{ display: "none" }}
              />
              <div style={{
                width: "50px",
                height: "26px",
                borderRadius: "13px",
                background: settings.autoApproveTeachers ? "#c62828" : "#ccc",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.3s"
              }}>
                <div style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "11px",
                  background: "white",
                  position: "absolute",
                  top: "2px",
                  left: settings.autoApproveTeachers ? "26px" : "2px",
                  transition: "left 0.3s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }} />
              </div>
            </label>
          </div>

          <div style={{
            padding: "1rem",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{ fontWeight: "600", color: "#333", marginBottom: "0.25rem" }}>
                Notifications par email
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                Envoyer des emails pour les nouvelles notifications
              </div>
            </div>
            <label style={{ position: "relative", display: "inline-block" }}>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                style={{ display: "none" }}
              />
              <div style={{
                width: "50px",
                height: "26px",
                borderRadius: "13px",
                background: settings.emailNotifications ? "#c62828" : "#ccc",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.3s"
              }}>
                <div style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "11px",
                  background: "white",
                  position: "absolute",
                  top: "2px",
                  left: settings.emailNotifications ? "26px" : "2px",
                  transition: "left 0.3s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }} />
              </div>
            </label>
          </div>

          <div style={{
            padding: "1rem",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{ fontWeight: "600", color: "#333", marginBottom: "0.25rem" }}>
                Mode maintenance
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                Restreindre l'accès à la plateforme
              </div>
            </div>
            <label style={{ position: "relative", display: "inline-block" }}>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                style={{ display: "none" }}
              />
              <div style={{
                width: "50px",
                height: "26px",
                borderRadius: "13px",
                background: settings.maintenanceMode ? "#c62828" : "#ccc",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.3s"
              }}>
                <div style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "11px",
                  background: "white",
                  position: "absolute",
                  top: "2px",
                  left: settings.maintenanceMode ? "26px" : "2px",
                  transition: "left 0.3s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }} />
              </div>
            </label>
          </div>
        </div>

        {/* Thème */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{
            display: "block",
            marginBottom: "1rem",
            fontWeight: "600",
            color: "#333"
          }}>
            Thème de l'interface
          </label>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { name: "Rouge ITEAM", value: "red", color: "#c62828" },
              { name: "Bleu", value: "blue", color: "#1976d2" },
              { name: "Vert", value: "green", color: "#2e7d32" },
              { name: "Violet", value: "purple", color: "#7b1fa2" },
              { name: "Sombre", value: "dark", color: "#424242" }
            ].map(theme => (
              <label key={theme.value} style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="theme"
                  value={theme.value}
                  checked={settings.theme === theme.value}
                  onChange={(e) => setSettings({...settings, theme: e.target.value})}
                  style={{ display: "none" }}
                />
                <div style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  border: `2px solid ${settings.theme === theme.value ? theme.color : "#e0e0e0"}`,
                  background: settings.theme === theme.value ? `${theme.color}10` : "white",
                  color: settings.theme === theme.value ? theme.color : "#666",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.3s"
                }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: theme.color,
                    border: "2px solid white",
                    boxShadow: "0 0 0 2px white, 0 0 0 4px " + theme.color
                  }} />
                  {theme.name}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={() => {
              setSettings({
                platformName: "ITEAM LMS",
                maxClassSize: 30,
                autoApproveTeachers: false,
                emailNotifications: true,
                maintenanceMode: false,
                theme: "red"
              });
              toast.info("Paramètres réinitialisés");
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "white",
              color: "#c62828",
              border: "2px solid #c62828",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#c62828";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
              e.target.style.color = "#c62828";
            }}
          >
            Réinitialiser
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: "0.75rem 2rem",
              background: "#c62828",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = "#8e0000";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = "#c62828";
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid white",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Sauvegarde...
              </>
            ) : (
              "💾 Sauvegarder les modifications"
            )}
          </button>
        </div>
      </div>

      {/* Section danger */}
      <div style={{
        background: "linear-gradient(135deg, #ff5252 0%, #c62828 100%)",
        color: "white",
        padding: "2rem",
        borderRadius: "16px",
        marginTop: "2rem"
      }}>
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.8rem" }}>
          ⚠️ Zone de danger
        </h2>
        <p style={{ margin: "0 0 1.5rem 0", opacity: 0.9 }}>
          Ces actions sont irréversibles. Procédez avec précaution.
        </p>
        
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              if (window.confirm("Vider le cache va améliorer les performances mais peut causer des ralentissements temporaires. Continuer ?")) {
                toast.success("Cache vidé avec succès");
              }
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            Vider le cache
          </button>

          <button
            onClick={() => {
              if (window.confirm("Vider tous les logs ? Cette action est irréversible.")) {
                toast.success("Logs vidés avec succès");
              }
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            Vider les logs
          </button>

          <button
            onClick={() => {
              if (window.confirm("⚠️ Cette action va redémarrer la plateforme. Les utilisateurs seront déconnectés temporairement. Continuer ?")) {
                toast.info("Redémarrage en cours...");
                setTimeout(() => toast.success("Plateforme redémarrée avec succès"), 2000);
              }
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "white",
              color: "#c62828",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "none";
              e.target.style.boxShadow = "none";
            }}
          >
            🔄 Redémarrer la plateforme
          </button>
        </div>
      </div>

      {/* Styles */}
      <style jsx="true">{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input[type="range"] {
          -webkit-appearance: none;
          height: 8px;
          border-radius: 4px;
          background: #e0e0e0;
          outline: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #c62828;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}