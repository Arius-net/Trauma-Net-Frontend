"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, FileText, Filter, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstadoFrapBadge, TriageBadge } from "@/components/StatusBadges";
import { api, ApiError, formatDateTime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { FrapListItem } from "@/types/api";

export default function ExpedientesListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FrapListItem[]>([]);
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listExpedientes(token, {
        estado_frap: estadoFilter || undefined,
        tipo_incidente: tipoFilter || undefined,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error cargando expedientes FRAP.");
    } finally {
      setLoading(false);
    }
  }, [token, estadoFilter, tipoFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  return (
    <AppShell allowedRoles={["CRUM", "PARAMEDICO", "JEFE_URGENCIAS"]}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Expedientes Clínicos FRAP (MongoDB + PostgreSQL)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filtra por estado (incluyendo <code className="font-mono">sin_asignacion</code>) o perfil clínico, y abre el detalle unificado.
            </p>
          </div>
          <button
            type="button"
            onClick={loadList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 pb-2">
            <Filter className="h-4 w-4 text-cyan-600" />
            Filtros:
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">Estado FRAP</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Todos los estados</option>
              <option value="sin_asignacion">sin_asignacion (Atención CRUM)</option>
              <option value="asignado">asignado</option>
              <option value="evaluando">evaluando</option>
              <option value="reportado">reportado</option>
              <option value="cerrado">cerrado</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">Perfil Clínico</label>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Todos los perfiles</option>
              <option value="politrauma">politrauma</option>
              <option value="infarto_agudo">infarto_agudo</option>
              <option value="trauma_craneoencefalico">trauma_craneoencefalico</option>
              <option value="intoxicacion_quemaduras">intoxicacion_quemaduras</option>
            </select>
          </div>
          <div className="ml-auto text-xs font-mono text-slate-500 pb-1.5">
            {items.length} expediente(s)
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Tabla de expedientes */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-4 py-3">FRAP / Paciente Sintético</th>
                <th className="px-4 py-3">Perfil / Protocolo</th>
                <th className="px-4 py-3">Triage</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Escena / Destino</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((f) => (
                <tr key={f.frap_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {f.paciente_sintetico.id_sintetico}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">{f.frap_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{f.tipo_incidente}</div>
                    <div className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400">{f.protocolo_codigo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <TriageBadge nivel={f.triage.nivel} />
                  </td>
                  <td className="px-4 py-3">
                    <EstadoFrapBadge estado={f.estado_frap} />
                    {f.motivo_sin_asignacion && (
                      <div className="mt-1 max-w-xs truncate text-[11px] text-red-600 dark:text-red-400">
                        {f.motivo_sin_asignacion}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800 dark:text-slate-200">{f.ubicacion_escena.municipio}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {f.hospital_destino_id ? `Destino: HOSP-0${f.hospital_destino_id}` : "Sin hospital asignado"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {formatDateTime(f.creado_en)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/expedientes/${f.frap_id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Abrir <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron expedientes FRAP con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
