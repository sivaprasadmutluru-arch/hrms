import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {api, LoginResponse, setApiSession} from '../api/client';
import {clearSession, loadSession, saveSession} from '../utils/storage';
import {clearLeaveAttachmentCache} from '../native/LeaveAttachmentFiles';

type AuthValue = {
  booting: boolean;
  token: string | null;
  user: LoginResponse | null;
  profile: any;
  signIn: (usernameOrEmail: string, password: string, remember?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<any>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [persistSession, setPersistSession] = useState(false);

  useEffect(() => {
    async function restore() {
      try {
        const session = await loadSession();
        if (session?.token) {
          setApiSession({token: session.token, companyId: session.user?.companyId});
          setToken(session.token);
          setUser(session.user);
          setProfile(session.profile || null);
          setPersistSession(true);
          // Refresh server-derived manager capabilities and roles on app restart.
          try {
            const freshProfile = await api.me();
            setProfile(freshProfile);
            await saveSession({...session, profile: freshProfile});
          } catch {
            // Keep the remembered session available when temporarily offline.
          }
        }
      } finally {
        setBooting(false);
      }
    }
    restore();
  }, []);

  const signIn = useCallback(async (usernameOrEmail: string, password: string, remember = true) => {
    const login = await api.login(usernameOrEmail, password);
    setApiSession({token: login.token, companyId: login.companyId});
    const employeeProfile = await api.me();
    setToken(login.token);
    setUser(login);
    setProfile(employeeProfile);
    setPersistSession(remember);
    if (remember) {
      await saveSession({token: login.token, user: login, profile: employeeProfile});
    } else {
      // A visible "Remember me" control must match the actual session behaviour.
      // The user remains signed in only until the app is closed.
      await clearSession();
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const employeeProfile = await api.me();
    setProfile(employeeProfile);
    if (persistSession && token && user) {
      await saveSession({token, user, profile: employeeProfile});
    }
    return employeeProfile;
  }, [persistSession, token, user]);

  const signOut = useCallback(async () => {
    setApiSession({});
    setToken(null);
    setUser(null);
    setProfile(null);
    setPersistSession(false);
    await clearSession();
    await clearLeaveAttachmentCache().catch(() => {});
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
