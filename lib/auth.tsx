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

async function loadFreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = data.session.expires_at ?? 0;
  if (expiresAt - now > REFRESH_LEEWAY_S) return data.session;
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session) {
    await supabase.auth.signOut();
    return null;
  }
  return refreshed.session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadFreshSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/";
  };

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
