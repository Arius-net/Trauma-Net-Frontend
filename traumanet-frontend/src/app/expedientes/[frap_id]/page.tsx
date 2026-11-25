"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  FileText,
  HeartPulse,
  Hospital,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DataVintageBadge,
  EstadoFrapBadge,
  EstadoViaBadge,
  TriageBadge,
} from "@/components/StatusBadges";
import { api, ApiError, formatDateTime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ExpedienteFRAPResponse } from "@/types/api";

export default function ExpedienteDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ frap_id: string }>();
  const frapId = params?.frap_id;

  const [data, setData] = useState<ExpedienteFRAPResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !frapId) return;
    setLoading(true);
    api
      .getExpediente(token, frapId)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error cargando expediente."))
      .finally(() => setLoading(false));
  }, [token, frapId]);

  return (
    <AppShell allowedRoles={["CRUM", "PARAMEDICO", "JEFE_URGENCIAS"]}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/expedientes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al listado de expedientes
          </Link>
          <span className="font-mono text-xs text-slate-500">FRAP ID: {frapId}</span>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Consultando expediente unificado (MongoDB + PostgreSQL)...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        )}

        {data && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Columna izquierda: Documento clínico completo (MongoDB) */}
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white">
                      Hoja FRAP — {data.frap.paciente_sintetico.id_sintetico}
                    </h1>
                    <div className="text-[11px] font-mono text-slate-500">
                      Fuente de verdad: MongoDB · {data.frap.protocolo_codigo}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TriageBadge nivel={data.frap.triage.nivel} />
                  <EstadoFrapBadge estado={data.frap.estado_frap} />
                </div>
              </div>

              {data.frap.motivo_sin_asignacion && (
                <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Motivo sin_asignacion:</strong> {data.frap.motivo_sin_asignacion}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-[10px] font-semibold uppercase text-slate-500">Paciente Sintético</div>
                  <div className="mt-1 font-semibold">
                    Sexo: {data.frap.paciente_sintetico.sexo} · {data.frap.paciente_sintetico.grupo_edad}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-[10px] font-semibold uppercase text-slate-500">Ubicación Escena</div>
                  <div className="mt-1 font-semibold">{data.frap.ubicacion_escena.municipio}</div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {data.frap.ubicacion_escena.latitud}, {data.frap.ubicacion_escena.longitud}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-[10px] font-semibold uppercase text-slate-500">Creado</div>
                  <div className="mt-1 font-mono text-[11px]">{formatDateTime(data.frap.creado_en)}</div>
                </div>
              </div>

              {/* Signos vitales seriados */}
              <div>
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  Signos Vitales Seriados ({data.frap.signos_vitales.length})
                </h2>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-500 dark:border-slate-800">
                        <th className="py-1.5 pr-3">Hora</th>
                        <th className="py-1.5 pr-3">FC</th>
                        <th className="py-1.5 pr-3">FR</th>
                        <th className="py-1.5 pr-3">TA</th>
                        <th className="py-1.5">SpO2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.frap.signos_vitales.map((sv, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 pr-3 text-[11px]">{formatDateTime(sv.medido_en)}</td>
                          <td className="py-1.5 pr-3">{sv.fc} lpm</td>
                          <td className="py-1.5 pr-3">{sv.fr} rpm</td>
                          <td className="py-1.5 pr-3">
                            {sv.ta_sistolica}/{sv.ta_diastolica}
                          </td>
                          <td className="py-1.5">{sv.spo2}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subdocumento polimórfico */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Subdocumento Clínico Flexible ({data.frap.tipo_incidente})
                </h2>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-3.5 font-mono text-xs text-cyan-200 dark:border-slate-800">
                  {JSON.stringify(data.frap.perfil, null, 2)}
                </pre>
              </div>

              {data.frap.notas && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <strong>Notas:</strong> {data.frap.notas}
                </div>
              )}
            </section>

            {/* Columna derecha: Traslado y reservas atómicas (PostgreSQL) */}
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-cyan-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Traslado y Reservas ACID
                    </h2>
                    <div className="text-[11px] font-mono text-slate-500">
                      Fuente de verdad: PostgreSQL
                    </div>
                  </div>
                </div>
                <Database className="h-4 w-4 text-slate-400" />
              </div>

              {!data.traslado ? (
                <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50/50 p-6 text-center text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  Este FRAP no tiene un traslado vinculado en PostgreSQL (estado actual:{" "}
                  <strong>{data.frap.estado_frap}</strong>).
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400">
                        HOSP-0{data.traslado.hospital_destino_id}
                      </span>
                      {data.traslado.estado_via && <EstadoViaBadge estado={data.traslado.estado_via} />}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {data.traslado.hospital_destino_nombre}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-white px-2 py-0.5 font-semibold uppercase dark:bg-slate-900">
                        Traslado: {data.traslado.estado}
                      </span>
                      {data.traslado.eta_min != null && (
                        <span className="rounded bg-white px-2 py-0.5 font-mono dark:bg-slate-900">
                          ETA {data.traslado.eta_min} ± {data.traslado.eta_margen_min ?? 0} min
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <DataVintageBadge iso={data.traslado.data_vintage} label="Vintage decisión" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Bitácora de Reservas ({data.traslado.reservas.length})
                    </h3>
                    <div className="mt-2 space-y-2">
                      {data.traslado.reservas.map((r) => (
                        <div
                          key={r.reserva_id}
                          className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {r.tipo_recurso} × {r.cantidad}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold uppercase dark:bg-slate-800">
                              {r.estado}
                            </span>
                          </div>
                          <div className="mt-1.5 space-y-0.5 font-mono text-[11px] text-slate-500">
                            <div>ID: {r.reserva_id}</div>
                            <div>Creada: {formatDateTime(r.creada_en)}</div>
                            <div>Expira (TTL): {formatDateTime(r.expira_en)}</div>
                            {r.cerrada_en && <div>Cerrada: {formatDateTime(r.cerrada_en)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
