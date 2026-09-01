const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('ct_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error?.message || `Request failed with status ${res.status}.`;
    const err = new Error(message);
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body;
}

export const api = {
  getClients: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return fetch(`${BASE}/clients${qs ? `?${qs}` : ''}`, { headers: authHeaders() }).then(handle);
  },
  addClient: (data) => fetch(`${BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  }).then(handle),
  updateClient: (clientId, data) => fetch(`${BASE}/clients/${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  }).then(handle),
  deleteClient: (clientId, soft = false) => fetch(`${BASE}/clients/${clientId}?soft=${soft}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle),
  getDashboard: () => fetch(`${BASE}/dashboard`, { headers: authHeaders() }).then(handle),
  getTeam: () => fetch(`${BASE}/dashboard/team`, { headers: authHeaders() }).then(handle),
  listUsers: () => fetch(`${BASE}/users`, { headers: authHeaders() }).then(handle),
  createUser: (data) => fetch(`${BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  }).then(handle),
    updateTarget: (userId, monthlyTarget) => fetch(`${BASE}/users/${userId}/target`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ monthlyTarget }),
  }).then(handle),
  deleteUser: (userId) => fetch(`${BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle),
};

