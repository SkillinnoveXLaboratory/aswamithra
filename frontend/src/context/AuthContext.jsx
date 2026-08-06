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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJson('aswamithra_user'));
  const [token, setToken] = useState(() => localStorage.getItem('aswamithra_access_token'));

  const saveSession = (payload) => {
    const nextUser = payload.user;
    setUser(nextUser);
    setToken(payload.accessToken);
    localStorage.setItem('aswamithra_user', JSON.stringify(nextUser));
    localStorage.setItem('aswamithra_access_token', payload.accessToken);
    if (payload.refreshToken) localStorage.setItem('aswamithra_refresh_token', payload.refreshToken);
    if (payload.isPendingApproval) localStorage.setItem('aswamithra_pending_approval', 'true');
    else localStorage.removeItem('aswamithra_pending_approval');
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
    setUser(null);
    setToken(null);
    localStorage.removeItem('aswamithra_user');
    localStorage.removeItem('aswamithra_access_token');
    localStorage.removeItem('aswamithra_refresh_token');
    localStorage.removeItem('aswamithra_pending_approval');
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isPendingApproval: localStorage.getItem('aswamithra_pending_approval') === 'true' || user?.status === 'pending_kyc',
      isAuthenticated: Boolean(user && token) && user?.status !== 'pending_kyc',
      sendOtp,
      verifyOtp,
      loginPin,
      googleLogin,
      logout,
      setUser,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
