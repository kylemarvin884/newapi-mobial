import { useRouter } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, setUnauthorizedHandler } from '@/api/client';
import { clearSessionToken, readSessionToken, writeSessionToken } from '@/storage/session';
import type { AuthResponse, RegisterInput, UserProfile } from '@/types/api';

interface LoginResult {
  requiresTwoFactor: boolean;
  challengeToken?: string;
}

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login(username: string, password: string): Promise<LoginResult>;
  register(input: RegisterInput): Promise<LoginResult>;
  verifyTwoFactor(challengeToken: string, code: string): Promise<void>;
  refreshUser(): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const acceptAuth = useCallback(async (response: AuthResponse) => {
    if (!response.access_token || !response.user) throw new Error('登录响应不完整');
    await writeSessionToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  useEffect(() => {
    void (async () => {
      const storedToken = await readSessionToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await api.me(storedToken);
        setToken(storedToken);
        setUser(profile);
      } catch {
        await clearSessionToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      void clearSessionToken();
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const response = await api.login(username, password);
      if (response.requires_two_factor) {
        return {
          requiresTwoFactor: true,
          challengeToken: response.challenge_token ?? undefined,
        };
      }
      await acceptAuth(response);
      return { requiresTwoFactor: false };
    },
    [acceptAuth],
  );

  const verifyTwoFactor = useCallback(
    async (challengeToken: string, code: string) => {
      const response = await api.verifyTwoFactor(challengeToken, code);
      await acceptAuth(response);
    },
    [acceptAuth],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<LoginResult> => {
      await api.register(input);
      return login(input.username, input.password);
    },
    [login],
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const profile = await api.me(token);
    setUser(profile);
  }, [token]);

  const logout = useCallback(async () => {
    const currentToken = token;
    setToken(null);
    setUser(null);
    await clearSessionToken();
    if (currentToken) {
      try {
        await api.logout(currentToken);
      } catch {}
    }
    router.replace('/login');
  }, [router, token]);

  const value = useMemo(
    () => ({ token, user, isLoading, login, register, verifyTwoFactor, refreshUser, logout }),
    [token, user, isLoading, login, register, verifyTwoFactor, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
