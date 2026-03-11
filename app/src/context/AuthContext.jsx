import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { api } from '../lib/apiClient';

const AuthContext = createContext(null);

/**
 * Normalizes a raw backend user object so UI components can safely
 * access `user.name` instead of having to join first_name + last_name
 * everywhere.
 */
const normalizeUser = (raw) => {
  if (!raw) return null;
  return {
    ...raw,
    name: [raw.first_name, raw.last_name].filter(Boolean).join(' ') || raw.email || 'User',
  };
};

export const AuthProvider = ({ children }) => {
  // Eagerly load user from local storage so there's zero UI blinking or "Access Denied" flashes 
  // on hard reloads or back/forward navigation
  const [user, setUserRaw] = useState(() => {
    const raw = api.getAuthTokens()?.user;
    return raw ? normalizeUser(raw) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Always normalize before setting so every consumer gets `user.name`
  const setUser = useCallback((raw) => setUserRaw(normalizeUser(raw)), []);

  // Hydrate from stored tokens and verify profile on mount
  useEffect(() => {
    const init = async () => {
      const stored = api.getAuthTokens();
      if (!stored?.tokens?.access) return;

      try {
        const profile = await api.get('/api/auth/profile/');
        setUser(profile);
      } catch (err) {
        if (err?.status === 401) {
          api.clearAuthTokens();
          setUserRaw(null);
        }
      }
    };
    init();
  }, [setUser]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const data = await api.post('/api/auth/login/', { email, password });
      api.saveAuthTokens(data);
      setUser(data.user);
      return normalizeUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const signup = useCallback(async (form) => {
    setIsLoading(true);
    try {
      const payload = {
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        phone_number: '',
        password: form.password,
        confirm_password: form.confirmPassword,
      };
      const data = await api.post('/api/auth/register/', payload);
      api.saveAuthTokens(data);
      setUser(data.user);
      return normalizeUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    const stored = api.getAuthTokens();
    const refresh = stored?.tokens?.refresh;
    api.clearAuthTokens();
    setUserRaw(null);
    if (refresh) {
      try {
        await api.post('/api/auth/logout/', { refresh });
      } catch {
        // ignore
      }
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUserRaw((prev) => (prev ? normalizeUser({ ...prev, ...updates }) : null));
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    role: user?.role || null,
    login,
    signup,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

