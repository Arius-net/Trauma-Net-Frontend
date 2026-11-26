"use client";

/**
 * Sesión JWT: token y usuario en memoria + sessionStorage (se borra al cerrar la pestaña).
 * No hay refresh: al vencer expires_at o recibir 401 se limpia la sesión, se redirige a /login
 * y se avisa «Tu sesión expiró».
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, configureApi } from "@/lib/api";
import { useNotify } from "@/components/Notifications";
import type { Rol, UserProfile } from "@/types/api";

const STORAGE_KEY = "traumanet.session";

interface StoredSession {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

interface SessionCtx {
  user: UserProfile | null;
  ready: boolean;
  login: (nombre_usuario: string, password: string) => Promise<UserProfile>;
  logout: () => void;
}

const SessionContext = createContext<SessionCtx | null>(null);

export function homeForRole(rol: Rol): string {
  switch (rol) {
    case "CRUM":
      return "/crum";
    case "JEFE_URGENCIAS":
      return "/urgencias";
    case "PARAMEDICO":
      return "/despacho";
  }
}

function readStored(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.token || new Date(s.expiresAt).getTime() <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const notify = useNotify();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    tokenRef.current = null;
    setSession(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const expire = useCallback(() => {
    if (!tokenRef.current) return;
    clear();
    notify("Tu sesión expiró", "Vuelve a iniciar sesión para continuar.");
    router.replace("/login");
  }, [clear, notify, router]);

  // Configuración del cliente API (token + manejadores globales).
  useEffect(() => {
    configureApi({
      getToken: () => tokenRef.current,
      onUnauthorized: expire,
      onNetworkError: () =>
        notify("Sin conexión con TraumaNet", "No se pudo contactar al servidor. Revisa la red e inténtalo de nuevo."),
    });
  }, [expire, notify]);

  // Restaurar la sesión de esta pestaña.
  useEffect(() => {
    const s = readStored();
    if (s) {
      tokenRef.current = s.token;
      setSession(s);
    }
    setReady(true);
  }, []);

  // Cierre automático al llegar a expires_at.
  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    const t = window.setTimeout(expire, Math.max(0, Math.min(ms, 2_147_000_000)));
    return () => window.clearTimeout(t);
  }, [session, expire]);

  const login = useCallback(async (nombre_usuario: string, password: string) => {
    const res = await api.login(nombre_usuario, password);
    const s: StoredSession = { token: res.access_token, expiresAt: res.expires_at, user: res.user };
    tokenRef.current = s.token;
    setSession(s);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* se mantiene solo en memoria */
    }
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clear();
    router.replace("/login");
  }, [clear, router]);

  const value = useMemo(
    () => ({ user: session?.user ?? null, ready, login, logout }),
    [session, ready, login, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
