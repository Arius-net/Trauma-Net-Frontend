"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, KeyRound, Moon, ShieldCheck, Sun } from "lucide-react";
import { ApiError } from "@/lib/api";
import { homeRouteForRole, useAuth } from "@/lib/auth-context";

interface DemoAccount {
  label: string;
  role: string;
  username: string;
  password: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "CRUM (Regulador)",
    role: "CRUM",
    username: "crum_sintetico_01",
    password: "TraumaCrum2026!",
    desc: "Consola de red, control de tramos, cascada y despacho",
  },
  {
    label: "Paramédico en ruta",
    role: "PARAMEDICO",
    username: "paramedico_sint_01",
    password: "TraumaParam2026!",
    desc: "Captura FRAP dinámico (4 perfiles) y asignación Decisión 1",
  },
  {
    label: "Jefe Urgencias (HOSP-01)",
    role: "JEFE_URGENCIAS",
    username: "jefe_urg_h1",
    password: "TraumaJefe2026!",
    desc: "Capacidad y reservas del Hospital Dr. Rafael Pascacio Gamboa",
  },
];

export default function LoginPage() {
  const { user, loading, darkMode, toggleDarkMode, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(homeRouteForRole(user.rol));
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const profile = await login(username, password);
      router.replace(homeRouteForRole(profile.rol));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error inesperado al iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
        <strong>TraumaNet apoya la decisión; no decide.</strong> Acceso autenticado vía JWT sobre usuarios sintéticos en PostgreSQL.
      </div>

      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label="Cambiar tema"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {darkMode ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 pb-12">
        <div className="grid w-full gap-6 md:grid-cols-5">
          {/* Panel de ingreso */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  TraumaNet · Inicio de Sesión
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Corredor Tuxtla Gutiérrez – San Cristóbal – Comitán
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Usuario sintético
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. crum_sintetico_01"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {submitting ? "Autenticando con FastAPI..." : "Ingresar con JWT"}
              </button>
            </form>
          </div>

          {/* Botones rápidos de demostración */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-cyan-600" />
              Cargar credenciales demo
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Perfiles sintéticos semilla para demostración en vivo (sin datos reales ni PHI).
            </p>

            <div className="mt-4 space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-cyan-400 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {acc.label}
                    </span>
                    <span className="rounded bg-cyan-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                      {acc.role}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {acc.username}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {acc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
