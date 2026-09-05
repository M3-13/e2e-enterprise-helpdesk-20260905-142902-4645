import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  getToken,
  setToken,
  type LoginPayload,
  type RegisterPayload,
  type UserOut,
} from "../api/client";

interface AuthContextValue {
  token: string | null;
  user: UserOut | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUser = useCallback(async (authToken: string | null) => {
    if (!authToken) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadUser(token).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [token, loadUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await api.login(payload);
    setToken(result.access_token);
    setTokenState(result.access_token);
    await loadUser(result.access_token);
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout failures; clear the local session regardless.
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.register(payload);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      await loadUser(token);
    }
  }, [token, loadUser]);

  const value = useMemo(
    () => ({ token, user, loading, login, logout, register, refreshUser }),
    [token, user, loading, login, logout, register, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
