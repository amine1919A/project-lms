// src/services/api.js - VERSION CORRIGÉE COMPLÈTE
import axios from "axios";
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 15000, // 15 secondes
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // IMPORTANT pour CORS
});

// Journalisation des requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    
    // DEBUG: Voir ce qui est envoyé
    console.log(`🌐 API Request: ${config.method.toUpperCase()} ${config.url}`);
    console.log(`🔑 Token présent: ${!!token}`);
    console.log(`📦 Token value: ${token ? token.substring(0, 20) + '...' : 'NULL'}`);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Headers avec Authorization:', config.headers);
    } else {
      console.warn('⚠️ Pas de token dans localStorage!');
    }
    
    return config;
  },
  (error) => {
    console.error("❌ Erreur requête:", error);
    return Promise.reject(error);
  }
);

// Gestion améliorée des erreurs
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Gestion du timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error(`⏱️ Timeout sur ${originalRequest?.url}`);
      
      // Retry une fois après 1 seconde
      if (!originalRequest._retryTimeout) {
        originalRequest._retryTimeout = true;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return api(originalRequest);
      }
    }
    
    // Gestion du ERR_FAILED (erreur de connexion)
    if (!error.response && error.message?.includes('ERR_FAILED')) {
      console.error('❌ Erreur de connexion au serveur');
      toast.error('Impossible de se connecter au serveur');
      return Promise.reject(error);
    }
    
    // Gestion CORS
    if (!error.response && error.message?.includes('CORS')) {
      console.error('🚫 Erreur CORS - Vérifiez la configuration du backend');
      toast.error('Erreur de connexion au serveur (CORS)');
      return Promise.reject(error);
    }
    
    console.error(`❌ API Error: ${error.response?.status || 'No Response'} ${originalRequest?.url}`);
    
    // Gestion des 403 (permissions)
    if (error.response?.status === 403) {
      const errorMsg = error.response.data?.error || error.response.data?.detail || 'Accès refusé';
      console.error('🚫 Accès refusé (403):', errorMsg);
      
      // Ne pas rediriger pour les erreurs normales de permission
      if (!errorMsg.includes('token') && !errorMsg.includes('authentifié')) {
        toast.error(`Accès refusé: ${errorMsg}`);
        return Promise.reject(error);
      }
      
      // Redirection seulement pour les problèmes d'authentification
      if (errorMsg.includes('non authentifié') || errorMsg.includes('token')) {
        localStorage.clear();
        window.location.href = "/login";
      }
      
    }
    
    // Gestion des 401 (refresh token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
      
      try {
        const res = await axios.post(
          "http://localhost:8000/api/accounts/token/refresh/",
          { refresh: refreshToken },
          { timeout: 10000, withCredentials: true }
        );
        
        const newToken = res.data.access;
        localStorage.setItem("access_token", newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Refresh token failed:', refreshError);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    // Gestion des autres erreurs
    if (error.response?.status === 404) {
      console.warn('⚠️ Ressource non trouvée:', originalRequest?.url);
      // Pas de toast pour les 404 - endpoints optionnels
    } else if (error.response?.status === 500) {
      console.error('❌ Erreur serveur 500');
      toast.error('Erreur serveur. Veuillez réessayer plus tard.');
    } else if (error.response?.status >= 400) {
      const msg = error.response.data?.detail || error.response.data?.message || 'Erreur';
      console.error(`❌ Erreur ${error.response.status}:`, msg);
      toast.error(`Erreur: ${msg}`);
    }
    
    return Promise.reject(error);
  }
);

// Helper pour les requêtes avec fallback automatique
export const safeApiCall = async (apiFunction, fallbackData = null, showError = true) => {
  try {
    const response = await apiFunction();
    return { data: response.data, error: null };
  } catch (error) {
    console.error('Safe API call failed:', error);
    
    // Ne pas afficher d'erreur pour les 404 (endpoints optionnels)
    if (showError && error.response?.status !== 404 && error.response?.status !== 403) {
      toast.error('Erreur de chargement des données');
    }
    
    return { data: fallbackData, error };
  }
};

// Fonctions d'extraction de données
export const extractArray = (response) => {
  const data = response?.data;
  
  if (!data) return [];
  
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.success && Array.isArray(data.data)) return data.data;
  
  // Si c'est un objet, vérifier la structure
  if (typeof data === 'object' && data !== null) {
    // Django REST Framework standard
    if ('results' in data) return data.results;
    // Notre format custom
    if ('success' in data && 'data' in data) return data.data;
    // Si c'est un objet unique, le mettre dans un tableau
    return [data];
  }
  
  return [];
};

export const extractObject = (response) => {
  const data = response?.data;
  
  if (!data) return null;
  
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }
  
  return data;
};

// Fonction de normalisation des réponses
export const normalizeResponse = (response) => {
  const data = response?.data;
  
  if (!data) return null;
  
  // Si c'est déjà un tableau
  if (Array.isArray(data)) return data;
  
  // Formats communs des APIs
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.data && Array.isArray(data.data)) return data.data;
  
  // Si c'est un objet avec un champ success et data
  if (data.success && data.data) {
    return Array.isArray(data.data) ? data.data : [data.data];
  }
  
  // Si c'est un objet simple, le mettre dans un tableau
  if (typeof data === 'object' && data !== null) {
    return [data];
  }
  
  return [];
};

export default api;