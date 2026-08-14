import { createContext, useContext, useMemo, useState } from 'react';
import { endpoints, unwrap } from '../services/api.js';

const AuthContext = createContext(null);

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function syncAccessFlags(nextUser, payload = {}) {
  const needsOnboarding =
    Boolean(payload.needsOnboarding) || nextUser?.status === 'needs_onboarding';
  // Pending is driven by live user status only — never keep a stale localStorage lock
  // after admin approval (status becomes active).
  const isPendingApproval = nextUser?.status === 'pending_kyc';

  if (needsOnboarding) localStorage.setItem('aswamithra_needs_onboarding', 'true');
  else localStorage.removeItem('aswamithra_needs_onboarding');

  if (isPendingApproval) localStorage.setItem('aswamithra_pending_approval', 'true');
  else localStorage.removeItem('aswamithra_pending_approval');

  return { needsOnboarding, isPendingApproval };
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => {
    const stored = readJson('aswamithra_user');
    if (stored) syncAccessFlags(stored);
    return stored;
  });
  const [token, setToken] = useState(() => localStorage.getItem('aswamithra_access_token'));

  const setUser = (nextUser) => {
    setUserState(nextUser);
    if (nextUser) {
      localStorage.setItem('aswamithra_user', JSON.stringify(nextUser));
      syncAccessFlags(nextUser);
    }
  };

  const saveSession = (payload) => {
    const nextUser = payload.user;
    setUserState(nextUser);
    setToken(payload.accessToken);
    localStorage.setItem('aswamithra_user', JSON.stringify(nextUser));
    localStorage.setItem('aswamithra_access_token', payload.accessToken);
    if (payload.refreshToken) localStorage.setItem('aswamithra_refresh_token', payload.refreshToken);
    syncAccessFlags(nextUser, payload);
  };

  const sendOtp = async ({ mobile, role }) => unwrap(await endpoints.sendOtp({ mobile, role }));

  const verifyOtp = async ({ mobile, otp, role }) => {
    const payload = unwrap(await endpoints.verifyOtp({ mobile, otp, role }));
    saveSession(payload);
    return payload;
  };

  const loginPin = async ({ mobile, pin, role }) => {
    const payload = unwrap(await endpoints.loginPin({ mobile, pin, role }));
    saveSession(payload);
    return payload;
  };

  const googleLogin = async (role) => {
    const payload = unwrap(await endpoints.google({ role }));
    saveSession(payload);
    return payload;
  };

  const logout = async () => {
    try {
      await endpoints.logout();
    } catch {
      // Local logout should still complete if the server is unavailable.
    }
    setUserState(null);
    setToken(null);
    localStorage.removeItem('aswamithra_user');
    localStorage.removeItem('aswamithra_access_token');
    localStorage.removeItem('aswamithra_refresh_token');
    localStorage.removeItem('aswamithra_pending_approval');
    localStorage.removeItem('aswamithra_needs_onboarding');
  };

  const needsOnboarding = user?.status === 'needs_onboarding';
  const isPendingApproval = user?.status === 'pending_kyc';

  const value = useMemo(
    () => ({
      user,
      token,
      needsOnboarding,
      isPendingApproval,
      isAuthenticated: Boolean(user && token),
      sendOtp,
      verifyOtp,
      loginPin,
      googleLogin,
      logout,
      setUser,
    }),
    [user, token, needsOnboarding, isPendingApproval],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
