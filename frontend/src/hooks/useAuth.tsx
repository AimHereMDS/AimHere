import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Profile } from "../types/game";
import {
  clearAuthToken,
  fetchCurrentUser,
  getAuthToken,
  loginWithPassword,
  registerWithPassword,
} from "../utils/auth";

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => undefined,
  register: async () => undefined,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await loginWithPassword(email, password);
    setUser(profile);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const profile = await registerWithPassword(email, password);
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
