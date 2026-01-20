import api from "./api";

export async function getNotifications() {
  try {
    const res = await api.get("/notifications/");
    return res.data;
  } catch (error) {
    console.error("Erreur récupération notifications :", error);
    return [];
  }
}
