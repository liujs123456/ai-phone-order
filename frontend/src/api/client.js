const BASE = import.meta.env.VITE_API_BASE ?? '';
const TOKEN_KEY = 'ai-phone-order.staff-token';
const STAFF_KEY = 'ai-phone-order.staff';
const MY_ORDERS_KEY = 'ai-phone-order.my-orders';

export const staffAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    const raw = localStorage.getItem(STAFF_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save: (loginResponse) => {
    localStorage.setItem(TOKEN_KEY, loginResponse.token);
    localStorage.setItem(
      STAFF_KEY,
      JSON.stringify({
        username: loginResponse.username,
        displayName: loginResponse.displayName,
        role: loginResponse.role,
      })
    );
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
  },
};

export const myOrders = {
  list: () => {
    try {
      return JSON.parse(localStorage.getItem(MY_ORDERS_KEY) ?? '[]');
    } catch {
      return [];
    }
  },
  add: (orderSnapshot) => {
    const all = myOrders.list();
    all.unshift(orderSnapshot);
    // keep last 20
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(all.slice(0, 20)));
  },
  patchStatus: (id, status) => {
    const all = myOrders.list().map((o) =>
      o.id === id ? { ...o, status } : o
    );
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(all));
  },
  clear: () => localStorage.removeItem(MY_ORDERS_KEY),
};

async function request(path, init = {}, { withStaffAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers ?? {}) };
  if (withStaffAuth) {
    const token = staffAuth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (withStaffAuth && (res.status === 401 || res.status === 403)) {
    staffAuth.clear();
    window.dispatchEvent(new Event('staff:expired'));
    throw new Error('Staff session expired — please log in again.');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `${res.status} ${res.statusText}`;
    try {
      msg = JSON.parse(text).error ?? msg;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Public — no auth
  listMenu: (q) => request(q ? `/api/menu?q=${encodeURIComponent(q)}` : '/api/menu'),
  chat: (messages) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  placeOrder: (payload) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (id) => request(`/api/orders/${id}`),

  // Staff-only
  staffLogin: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  listOrders: () => request('/api/orders', {}, { withStaffAuth: true }),
  updateOrderStatus: (id, status) =>
    request(
      `/api/orders/${id}/status`,
      { method: 'PUT', body: JSON.stringify({ status }) },
      { withStaffAuth: true }
    ),
  cancelOrder: (id) =>
    request(`/api/orders/${id}`, { method: 'DELETE' }, { withStaffAuth: true }),
};
