// src/services/lmsService.js
import api from "./api";

export const getTests = () => api.get("/lms/tests/");
export const getRanking = (testId) => api.get("/lms/scores/ranking/", { params: { test_id: testId } });