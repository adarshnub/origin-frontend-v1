"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface SessionData { user: User | null; csrfToken: string | null }
interface AuthContextValue { user: User | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionData>("/auth/session"), retry: false });
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["session"] }); };
  const signOut = async () => { await api("/auth/logout", { method: "POST" }); await refresh(); };
  return <AuthContext.Provider value={{ user: session.data?.user ?? null, loading: session.isLoading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
