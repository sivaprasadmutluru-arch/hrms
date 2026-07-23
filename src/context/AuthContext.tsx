import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {api, LoginResponse, setApiSession} from '../api/client';
import {clearSession, loadSession, saveSession} from '../utils/storage';

type AuthValue = {
  booting: boolean;
  token: string | null;
  user: LoginResponse | null;
  profile: any;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<any>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function restore() {
      try {
        const session = await loadSession();
        if (session?.token) {
          setApiSession({token: session.token, companyId: session.user?.companyId});
          setToken(session.token);
          setUser(session.user);
          setProfile(session.profile || null);
        }
      } finally {
        setBooting(false);
      }
    }
    restore();
  }, []);

  const signIn = useCallback(async (usernameOrEmail: string, password: string) => {
    const login = await api.login(usernameOrEmail, password);
    setApiSession({token: login.token, companyId: login.companyId});
    const employeeProfile = await api.me();
    setToken(login.token);
    setUser(login);
    setProfile(employeeProfile);
    await saveSession({token: login.token, user: login, profile: employeeProfile});
  }, []);

  const refreshProfile = useCallback(async () => {
    const employeeProfile = await api.me();
    setProfile(employeeProfile);
    if (token && user) {
      await saveSession({token, user, profile: employeeProfile});
    }
    return employeeProfile;
  }, [token, user]);

  const signOut = useCallback(async () => {
    setApiSession({});
    setToken(null);
    setUser(null);
    setProfile(null);
    await clearSession();
  }, []);

  const value = useMemo(
    () => ({booting, token, user, profile, signIn, signOut, refreshProfile}),
    [booting, token, user, profile, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
