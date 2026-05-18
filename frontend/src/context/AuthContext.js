import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Axios: attach JWT to every request ────────────────────────────────────────
axios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pragati_token');
  // Never attach token to login/register — it would confuse the server
  const isAuthRoute = cfg.url?.includes('/auth/login') || cfg.url?.includes('/auth/register');
  if (token && !isAuthRoute) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// ── Axios: auto-refresh on 401 ONLY ───────────────────────────────────────────
// IMPORTANT: Only retry on 401 (expired token). 
// 403 = forbidden (role issue) → do NOT refresh, just reject.
// 429 = rate limit → do NOT refresh.
// This was the main cause of the login lockout loop.
axios.interceptors.response.use(
  res => res,
  async err => {
    const status = err.response?.status;
    const isAuthRoute = err.config?.url?.includes('/auth/login') ||
                        err.config?.url?.includes('/auth/register') ||
                        err.config?.url?.includes('/auth/refresh');

    // Only attempt refresh for 401 on non-auth routes, and only once per request
    if (status === 401 && !isAuthRoute && !err.config._retry) {
      err.config._retry = true;
      try {
        const rt = localStorage.getItem('pragati_refresh');
        if (!rt) {
          // No refresh token — clean logout
          localStorage.removeItem('pragati_token');
          localStorage.removeItem('pragati_refresh');
          window.location.href = '/login';
          return Promise.reject(err);
        }
        // Call refresh with a fresh axios instance to avoid interceptor loop
        const { data } = await axios.post(
          `${API}/auth/refresh`,
          { refreshToken: rt },
          { headers: { Authorization: '' } }  // prevent interceptor attaching old token
        );
        localStorage.setItem('pragati_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('pragati_refresh', data.refreshToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(err.config);
      } catch (refreshErr) {
        // Refresh failed → clear everything and redirect to login
        localStorage.removeItem('pragati_token');
        localStorage.removeItem('pragati_refresh');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    // 403 = role/permission issue → just reject normally, don't retry
    // 429 = rate limit → just reject normally
    return Promise.reject(err);
  }
);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-hydrate user from /me on page load
  useEffect(() => {
    const token = localStorage.getItem('pragati_token');
    if (token) {
      axios.get(`${API}/auth/me`)
        .then(r => setUser(r.data.user))
        .catch(() => {
          // Token invalid — clear silently; interceptor handles redirect if needed
          localStorage.removeItem('pragati_token');
          localStorage.removeItem('pragati_refresh');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    // Always clear stale tokens before a fresh login
    localStorage.removeItem('pragati_token');
    localStorage.removeItem('pragati_refresh');
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('pragati_token', data.accessToken);
      localStorage.setItem('pragati_refresh', data.refreshToken);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      throw new Error(msg);
    }
  };

  const register = async (formData) => {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('pragati_token', data.accessToken);
    localStorage.setItem('pragati_refresh', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('pragati_token');
    localStorage.removeItem('pragati_refresh');
    setUser(null);
    // Hard redirect clears all React state — prevents stale state after role switch
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
