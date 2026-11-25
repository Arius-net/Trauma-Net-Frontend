"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Building2,
  Database,
  FileText,
  LogOut,
  Moon,
  Network,
  Sun,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { HealthResponse, UserRole } from "@/types/api";

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/crum", label: "Consola CRUM y Red", roles: ["CRUM"], icon: Network },
  { href: "/paramedico", label: "Captura FRAP", roles: ["PARAMEDICO", "CRUM"], icon: Ambulance },
  { href: "/urgencias", label: "Panel Urgencias", roles: ["JEFE_URGENCIAS", "CRUM"], icon: Building2 },
  { href: "/expedientes", label: "Expedientes", roles: ["CRUM", "PARAMEDICO", "JEFE_URGENCIAS"], icon: FileText },
];

export function AppShell({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, loading, darkMode, toggleDarkMode, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Activity className="h-5 w-5 animate-pulse text-cyan-600" />
          Verificando sesión JWT de TraumaNet...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const forbidden = allowedRoles && !allowedRoles.includes(user.rol);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Banner persistente de gobernanza (DECISION_SPEC §1) */}
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <strong>TraumaNet apoya la decisión; no decide.</strong> El regulador médico confirma el traslado. Datos operativos y clínicos 100 % sintéticos.
        </span>
      </div>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  TraumaNet
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Corredor Tuxtla – San Cristóbal – Comitán
                </div>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-1">
              {NAV_ITEMS.filter((item) => item.roles.includes(user.rol)).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {health && (
              <div
                title="Conectividad en vivo reportada por FastAPI /api/v1/health"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              >
                <Database className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className={health.engines.postgresql === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                  PG
                </span>
                ·
                <span className={health.engines.mongodb === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                  Mongo
                </span>
                ·
                <span className={health.engines.neo4j === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                  Neo4j
                </span>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-right dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                {user.nombre_usuario}
              </div>
              <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                {user.rol}
                {user.hospital_id ? ` · HOSP-0${user.hospital_id}` : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Cambiar tema claro/oscuro"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-red-950/60 dark:hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {forbidden ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
            <h2 className="text-lg font-bold">Acceso restringido por rol</h2>
            <p className="mt-1 text-sm">
              Tu sesión actual tiene rol <strong>{user.rol}</strong> y esta vista está reservada para:{" "}
              <strong>{allowedRoles?.join(", ")}</strong>.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
