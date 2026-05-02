import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vocab_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vocab_token');
      localStorage.removeItem('vocab_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  getMe:    ()      => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
};

// ─── Vocabulary ───────────────────────────────────────────────────────────────
export const vocabAPI = {
  getAll:   (params) => api.get('/vocab', { params }),
  getOne:   (wordId) => api.get(`/vocab/${wordId}`),
  addWord:  (data)   => api.post('/vocab', data),
  update:   (wordId, data) => api.patch(`/vocab/${wordId}`, data),
  remove:   (wordId) => api.delete(`/vocab/${wordId}`),
};

// ─── SRS ──────────────────────────────────────────────────────────────────────
export const srsAPI = {
  getDueCards: (limit) => api.get('/srs/due', { params: { limit } }),
  getStats:    ()      => api.get('/srs/stats'),
  submitReview: (data) => api.post('/srs/review', data),
  resetCard:   (wordId) => api.post(`/srs/reset/${wordId}`),
};

// ─── Dictionary ───────────────────────────────────────────────────────────────
export const dictionaryAPI = {
  lookup: (word) => api.get(`/dictionary/${encodeURIComponent(word)}`),
  search: (q)    => api.get('/dictionary/search', { params: { q } }),
};

// ─── Vision / OCR ─────────────────────────────────────────────────────────────
export const visionAPI = {
  ocrBase64: (image, mimeType) =>
    api.post('/vision/ocr/base64', { image, mimeType }),
  ocrFile: (formData) =>
    api.post('/vision/ocr', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  registerToken: (fcmToken) => api.post('/notifications/token', { fcmToken }),
  sendTest:      ()          => api.post('/notifications/test'),
  unregister:    ()          => api.delete('/notifications/token'),
};

export default api;
