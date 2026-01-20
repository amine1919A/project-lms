import api from "./api";

// --- Live Sessions ---
export async function startLiveSession(courseId) {
  try {
    const res = await api.post("/live/start/", { courseId });
    return res.data;
  } catch (error) {
    console.error("Erreur démarrage session live :", error);
    return null;
  }
}

export async function endLiveSession(sessionId) {
  try {
    const res = await api.post(`/live/${sessionId}/end/`);
    return res.data;
  } catch (error) {
    console.error("Erreur fin session live :", error);
    return null;
  }
}

export async function getLiveSessions() {
  try {
    const res = await api.get("/live/");
    return res.data;
  } catch (error) {
    console.error("Erreur récupération sessions live :", error);
    return [];
  }
}
