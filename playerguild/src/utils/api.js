// src/utils/api.js
// Central API client — all backend calls go through here

const BASE_URL = process.env.REACT_APP_API_URL || '';

// ─── Token storage ────────────────────────────────────────────────────────────
export function getToken()        { return localStorage.getItem('pg_token'); }
export function setToken(t)       { localStorage.setItem('pg_token', t); }
export function clearToken()      { localStorage.removeItem('pg_token'); }

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
const PUBLIC_PATHS = ['/api/auth/', '/api/users/', '/api/quests', '/api/leaderboard', '/api/activity'];

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p)) && method === 'GET';
  if (token && !isPublic) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Got HTML or plain text — almost always a proxy/routing misconfiguration
    const text = await res.text();
    throw new Error(
      `Server returned non-JSON response (${res.status}):\n${text.slice(0, 200)}`
    );
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const get  = (path)        => request('GET',   path);
const post = (path, body)  => request('POST',  path, body);
const patch= (path, body)  => request('PATCH', path, body);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  // Get a challenge string to sign with your wallet
  getChallenge: (wallet) =>
    post('/api/auth/challenge', { wallet }),

  // Send the signed challenge back, receive a JWT
  verify: async (wallet, challenge, signature) => {
    const { token } = await post('/api/auth/verify', { wallet, challenge, signature });
    setToken(token);
    return token;
  },

  logout: () => clearToken(),

  // ─── Users ────────────────────────────────────────────────────────────────
  getUser:       (wallet) => get(`/api/users/${wallet}`),
  updateProfile: (data)   => patch('/api/users/me', data),
  getReviews:    (wallet) => get(`/api/users/${wallet}/reviews`),

  // ─── Quests ───────────────────────────────────────────────────────────────
  // Save quest metadata to backend AFTER posting on-chain
  saveQuest: (data) => post('/api/quests', data),

  // Search/filter quests from backend (richer than on-chain)
  getQuests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return get(`/api/quests${qs ? '?' + qs : ''}`);
  },

  getQuest: (id) => get(`/api/quests/${id}`),

  // ─── Reviews ──────────────────────────────────────────────────────────────
  leaveReview: (questId, data) => post(`/api/quests/${questId}/reviews`, data),

  // ─── Messages ─────────────────────────────────────────────────────────────
  getMessages:  (questId)       => get(`/api/quests/${questId}/messages`),
  sendMessage:  (questId, body) => post(`/api/quests/${questId}/messages`, { body }),

  // ─── Notifications ────────────────────────────────────────────────────────
  getNotifications: () => get('/api/notifications'),
  markAllRead:      () => patch('/api/notifications/read'),

  // ─── Activity & Leaderboard ───────────────────────────────────────────────
  getActivity:    (wallet) => get(`/api/activity${wallet ? '?wallet=' + wallet : ''}`),
  getLeaderboard: ()       => get('/api/leaderboard'),

  // ─── Ratings ──────────────────────────────────────────────────────────────
  rateUser: (wallet, data) => post(`/api/users/${wallet}/rate`, data),
};