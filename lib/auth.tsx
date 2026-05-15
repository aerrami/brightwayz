"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true, signOut: async () => {} });

const REFRESH_LEEWAY_S = 60;
const AUTH_TIMEOUT_MS = 5000;

async function loadFreshSession(): Promise<Session | null> {
  let stored: Session | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    stored = data.session;
  } catch {
    return null;
  }
  if (!stored) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = stored.expires_at ?? 0;
  if (expiresAt - now > REFRESH_LEEWAY_S) return stored;

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    return data.session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const finalize = (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      setLoading(false);
    };
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS));
    Promise.race([loadFreshSession(), timeout]).then(finalize).catch(() => finalize(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(s);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch { /* still redirect */ }
    window.location.href = "/login/";
  };

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
