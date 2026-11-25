"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  RefreshCw,
  Route,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataVintageBadge, EstadoViaBadge } from "@/components/StatusBadges";
import { api, ApiError, formatDateTime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  CascadeDerivationResponse,
  EstadoVia,
  NetworkOverviewResponse,
  ProtocoloCodigo,
} from "@/types/api";

const TRAMOS_CORREDOR = [
  { id: "T-TUX-COM", label: "Tuxtla ↔ Comitán (directo)" },
  { id: "T-TUX-SCLC", label: "Tuxtla ↔ San Cristóbal" },
  { id: "T-SCLC-COM", label: "San Cristóbal ↔ Comitán" },
];

const PROTOCOLOS: Array<{ codigo: ProtocoloCodigo; label: string }> = [
  { codigo: "PT-POLITRAUMA", label: "PT-POLITRAUMA (Quirófano)" },
  { codigo: "PT-IAM", label: "PT-IAM — Infarto Agudo (Cama UCI)" },
  { codigo: "PT-TCE", label: "PT-TCE — Craneoencefálico (Cama UCI)" },
  { codigo: "PT-INTOX-QUEM", label: "PT-INTOX-QUEM (Sala de Choque)" },
];

export default function CrumConsolePage() {
  const { token } = useAuth();
  const [network, setNetwork] = useState<NetworkOverviewResponse | null>(null);
  const [loadingNet, setLoadingNet] = useState(true);
  const [netError, setNetError] = useState<string | null>(null);

  // Control de tramos viales (Neo4j)
  const [updatingTramo, setUpdatingTramo] = useState<string | null>(null);
  const [tramoMessage, setTramoMessage] = useState<string | null>(null);

  // Simulador de derivación en cascada (Decisión 2)
  const [satHospitalId, setSatHospitalId] = useState<number>(7);
  const [protocolo, setProtocolo] = useState<ProtocoloCodigo>("PT-TCE");
  const [cascade, setCascade] = useState<CascadeDerivationResponse | null>(null);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  const loadNetwork = useCallback(async () => {
    if (!token) return;
    setLoadingNet(true);
    setNetError(null);
    try {
      const data = await api.getNetworkHospitals(token);
      setNetwork(data);
    } catch (err) {
      setNetError(err instanceof ApiError ? err.message : "Error cargando red hospitalaria.");
    } finally {
      setLoadingNet(false);
    }
  }, [token]);

  const runCascade = useCallback(
    async (hospId: number, prot: ProtocoloCodigo) => {
      if (!token) return;
      setLoadingCascade(true);
      setCascadeError(null);
      try {
        const res = await api.getCascade(token, hospId, prot);
        setCascade(res);
      } catch (err) {
        setCascadeError(err instanceof ApiError ? err.message : "Error evaluando derivación en cascada.");
      } finally {
        setLoadingCascade(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    loadNetwork();
    runCascade(7, "PT-TCE");
  }, [token, loadNetwork, runCascade]);

  // Estado actual de cada tramo carretero desde las aristas de Neo4j
  const tramoStates = useMemo(() => {
    const map: Record<string, EstadoVia> = {};
    if (!network) return map;
    for (const h of network.hospitales) {
      for (const c of h.conexiones) {
        if (!map[c.tramo_id]) {
          map[c.tramo_id] = c.estado_via;
        }
      }
    }
    return map;
  }, [network]);

  // KPIs agregados del corredor
  const kpis = useMemo(() => {
    if (!network) return { uci: 0, quir: 0, choque: 0, oldestVintage: null as string | null };
    let uci = 0;
    let quir = 0;
    let choque = 0;
    let oldest: string | null = null;
    for (const h of network.hospitales) {
      for (const r of h.recursos) {
        if (r.tipo_recurso === "cama_uci") uci += r.disponibles;
        if (r.tipo_recurso === "quirofano") quir += r.disponibles;
        if (r.tipo_recurso === "sala_choque") choque += r.disponibles;
        if (!oldest || new Date(r.actualizado_en) < new Date(oldest)) {
          oldest = r.actualizado_en;
        }
      }
    }
    return { uci, quir, choque, oldestVintage: oldest };
  }, [network]);

  async function handleTramoChange(tramoId: string, estado: EstadoVia) {
    if (!token) return;
    setUpdatingTramo(tramoId);
    setTramoMessage(null);
    try {
      const res = await api.updateTramo(token, tramoId, estado);
      setTramoMessage(
        `Tramo ${res.tramo_id} actualizado a ${res.estado_via.toUpperCase()} (${res.aristas_actualizadas} aristas en Neo4j). Rutas recalculadas en vivo.`
      );
      await loadNetwork();
      await runCascade(satHospitalId, protocolo);
    } catch (err) {
      setTramoMessage(err instanceof ApiError ? err.message : "Error actualizando tramo.");
    } finally {
      setUpdatingTramo(null);
    }
  }

  return (
    <AppShell allowedRoles={["CRUM"]}>
      <div className="space-y-6">
        {/* Encabezado + KPIs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Consola CRUM — Corredor Hospitalario y Derivación
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visibilidad multiparadigma en vivo: capacidad relacional (PostgreSQL) + topología vial y protocolos (Neo4j).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DataVintageBadge iso={kpis.oldestVintage} label="Frescura red" />
            <button
              type="button"
              onClick={() => {
                loadNetwork();
                runCascade(satHospitalId, protocolo);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingNet ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Tarjetas KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase text-slate-500">Hospitales Activos</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {network?.total_hospitales ?? "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">Niveles 2 y 3 en Chiapas</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase text-cyan-600 dark:text-cyan-400">Camas UCI Libres</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{kpis.uci}</div>
            <div className="mt-1 text-xs text-slate-500">Inventario ACID en PostgreSQL</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Quirófanos Libres</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{kpis.quir}</div>
            <div className="mt-1 text-xs text-slate-500">Disponibles para politrauma</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Salas de Choque Libres</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{kpis.choque}</div>
            <div className="mt-1 text-xs text-slate-500">Estabilización inmediata</div>
          </div>
        </div>

        {/* Control en vivo de tramos + Simulador de Derivación en Cascada */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Control de tramos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-cyan-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Control en Vivo de Tramos Viales (Neo4j)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cambia <code className="font-mono">T-TUX-COM</code> a <strong>demora</strong> o{" "}
              <strong>bloqueo</strong> para observar el recálculo automático en 2 saltos vía San Cristóbal (
              <code className="font-mono">T-SCLC-COM + T-TUX-SCLC</code>).
            </p>

            <div className="mt-4 space-y-3">
              {TRAMOS_CORREDOR.map((tramo) => {
                const current = tramoStates[tramo.id] ?? "normal";
                return (
                  <div
                    key={tramo.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {tramo.id}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{tramo.label}</div>
                      </div>
                      <EstadoViaBadge estado={current} />
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      {(["normal", "demora", "bloqueo"] as EstadoVia[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={updatingTramo === tramo.id}
                          onClick={() => handleTramoChange(tramo.id, st)}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold uppercase transition ${
                            current === st
                              ? st === "bloqueo"
                                ? "border-red-600 bg-red-600 text-white"
                                : st === "demora"
                                ? "border-amber-500 bg-amber-500 text-slate-950"
                                : "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {tramoMessage && (
              <div className="mt-3 rounded-lg border border-cyan-300 bg-cyan-50 p-2.5 text-xs text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200">
                {tramoMessage}
              </div>
            )}
          </section>

          {/* Simulador de Derivación en Cascada */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-cyan-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Simulador de Derivación en Cascada (Decisión 2)
                </h2>
              </div>
              {cascade?.data_vintage && <DataVintageBadge iso={cascade.data_vintage} />}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Hospital saturado / origen
                </label>
                <select
                  value={satHospitalId}
                  onChange={(e) => setSatHospitalId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {(network?.hospitales ?? []).map((h) => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      HOSP-0{h.hospital_id} · {h.nombre}
                    </option>
                  ))}
                  {!network && <option value={7}>HOSP-07 · Comitán</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Protocolo de Trauma
                </label>
                <select
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value as ProtocoloCodigo)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {PROTOCOLOS.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={loadingCascade}
                  onClick={() => runCascade(satHospitalId, protocolo)}
                  className="w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {loadingCascade ? "Calculando..." : "Evaluar cascada"}
                </button>
              </div>
            </div>

            {cascadeError && (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                {cascadeError}
              </div>
            )}

            {cascade && (
              <div className="mt-4 space-y-2.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Recurso crítico requerido:{" "}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {cascade.recurso_critico}
                  </strong>{" "}
                  · Vecinos compatibles en grafo: <strong>{cascade.opciones_derivacion.length}</strong>
                </div>

                {cascade.opciones_derivacion.length === 0 ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    Ningún hospital vecino cumple los requisitos estructurales del protocolo {cascade.protocolo_codigo}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cascade.opciones_derivacion.map((opt) => (
                      <div
                        key={opt.hospital_id}
                        className={`rounded-xl border p-3 ${
                          opt.viable
                            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
                            : "border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {opt.viable ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              HOSP-0{opt.hospital_id} · {opt.nombre}
                            </span>
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Nivel {opt.nivel_atencion}
                            </span>
                          </div>
                          <EstadoViaBadge estado={opt.estado_via} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-mono">
                            Ruta: <strong>{opt.tramo_id}</strong>
                          </span>
                          <span className="font-mono">
                            ETA: <strong>{opt.eta_min} min</strong> (±{opt.eta_margen_min} min) · {opt.distancia_km} km
                          </span>
                          <span className="font-mono">
                            {opt.tipo_recurso}: <strong>{opt.recurso_disponibles} disp.</strong>
                          </span>
                          <span>
                            Guardia:{" "}
                            <strong className={opt.guardia_presente ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {opt.guardia_presente ? "Presente" : "Ausente"}
                            </strong>
                          </span>
                        </div>

                        {opt.motivo_no_viable && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Descarte operativo: {opt.motivo_no_viable}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Panel de los 8 hospitales del corredor */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Corredor Tuxtla Gutiérrez – San Cristóbal – Comitán (8 Hospitales)
            </h2>
          </div>

          {netError && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
              {netError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {(network?.hospitales ?? []).map((h) => {
              const latestVintage = h.recursos[0]?.actualizado_en;
              return (
                <div
                  key={h.hospital_id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-100 px-1.5 py-0.5 font-mono text-xs font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                          {h.clave}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Nivel {h.nivel_atencion}
                        </span>
                        <span className="text-xs text-slate-500">{h.municipio}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                        {h.nombre}
                      </h3>
                    </div>
                    <DataVintageBadge iso={latestVintage} />
                  </div>

                  {/* Capacidad en vivo (PostgreSQL) */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {h.recursos.map((r) => (
                      <div
                        key={r.recurso_id}
                        className={`rounded-lg border p-2 text-center ${
                          r.disponibles === 0
                            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                            : r.disponibles === 1
                            ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
                        }`}
                      >
                        <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                          {r.tipo_recurso.replace("_", " ")}
                        </div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                          {r.disponibles}
                          <span className="text-xs font-normal text-slate-500">/{r.total}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          oc:{r.ocupados} · res:{r.reservados}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Especialidades y equipos (Neo4j) */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {h.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-slate-400">
                    Actualizado: {formatDateTime(latestVintage)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
