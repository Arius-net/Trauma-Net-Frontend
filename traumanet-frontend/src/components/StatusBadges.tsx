"use client";

import React from "react";
import { Clock } from "lucide-react";
import { formatDateTime, formatVintageAge } from "@/lib/api";
import type { EstadoFrap, EstadoVia, NivelTriage } from "@/types/api";

export function TriageBadge({ nivel }: { nivel: NivelTriage | string }) {
  const map: Record<string, string> = {
    rojo: "bg-red-600 text-white border-red-700",
    amarillo: "bg-amber-400 text-slate-950 border-amber-500",
    verde: "bg-emerald-600 text-white border-emerald-700",
    negro: "bg-slate-800 text-white border-slate-900 dark:bg-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        map[nivel] ?? "bg-slate-200 text-slate-800 border-slate-300"
      }`}
    >
      Triage {nivel}
    </span>
  );
}

export function EstadoFrapBadge({ estado }: { estado: EstadoFrap | string }) {
  const map: Record<string, string> = {
    asignado: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    sin_asignacion: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    evaluando: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    reportado: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    cerrado: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
        map[estado] ?? "bg-slate-100 text-slate-700 border-slate-300"
      }`}
    >
      {estado}
    </span>
  );
}

export function EstadoViaBadge({ estado }: { estado: EstadoVia | string }) {
  const map: Record<string, string> = {
    normal: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    demora: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    bloqueo: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase ${
        map[estado] ?? "bg-slate-100 text-slate-700 border-slate-300"
      }`}
    >
      {estado}
    </span>
  );
}

export function DataVintageBadge({
  iso,
  label = "Frescura",
}: {
  iso: string | null | undefined;
  label?: string;
}) {
  return (
    <span
      title={iso ? `Última actualización de inventario: ${formatDateTime(iso)}` : "Sin timestamp"}
      className="inline-flex items-center gap-1 rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 font-mono text-xs text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200"
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>{label}:</span>
      <strong>{formatVintageAge(iso)}</strong>
    </span>
  );
}
