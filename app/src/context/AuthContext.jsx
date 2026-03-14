import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { api, setSessionHint, resetSessionState } from '../lib/apiClient';

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
  const [user, setUserRaw] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Always normalize before setting so every consumer gets `user.name`
  const setUser = useCallback((raw) => setUserRaw(normalizeUser(raw)), []);

  // Verify session cookies on mount — attempts a token refresh if profile fetch fails
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const profile = await api.get('/api/auth/profile/');
        if (isMounted) {
          setUser(profile);
          // Ensure the session hint and state are fresh after a successful profile load
          resetSessionState();
        }
      } catch (err) {
        if (isMounted) {
          setUserRaw(null);
          setSessionHint(false);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [setUser]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const data = await api.post('/api/auth/login/', { email, password });
      setUser(data.user);
      // Reset session state so subsequent 401s correctly trigger refresh
      resetSessionState();
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
      setUser(data.user);
      resetSessionState();
      return normalizeUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    setUserRaw(null);
    setSessionHint(false);
    try {
      await api.post('/api/auth/logout/', {});
    } catch {
      // ignore
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUserRaw((prev) => (prev ? normalizeUser({ ...prev, ...updates }) : null));
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitializing,
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
