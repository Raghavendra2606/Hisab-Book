'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    setup: false,
    loggedIn: false,
    companyName: 'Purnima Construction',
    loading: true
  });

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setAuthState({
        setup: data.setup,
        loggedIn: data.loggedIn,
        companyName: data.companyName || 'Purnima Construction',
        loading: false
      });
    } catch (e) {
      console.error("Auth check failed:", e);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username, password) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      const data = await res.json();
      if (data.error) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false, error: data.error };
      }
      await checkAuth();
      return { success: true };
    } catch (e) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Connection error' };
    }
  };

  const setupAdmin = async (username, password, companyName) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', username, password, companyName })
      });
      const data = await res.json();
      if (data.error) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false, error: data.error };
      }
      await checkAuth();
      return { success: true };
    } catch (e) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      setAuthState({
        setup: true,
        loggedIn: false,
        companyName: authState.companyName,
        loading: false
      });
    } catch (e) {
      console.error("Logout failed:", e);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, setupAdmin, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
