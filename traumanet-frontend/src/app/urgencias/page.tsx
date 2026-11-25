"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Save,
  TimerOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataVintageBadge } from "@/components/StatusBadges";
import { api, ApiError, formatDateTime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { HospitalCapacityResponse, ReservaHospitalItem, TipoRecurso } from "@/types/api";

export default function UrgenciasPage() {
  const { token, user } = useAuth();
  const [hospitalId, setHospitalId] = useState<number>(1);
  const [capacity, setCapacity] = useState<HospitalCapacityResponse | null>(null);
  const [reservas, setReservas] = useState<ReservaHospitalItem[]>([]);
  const [edits, setEdits] = useState<Record<string, { total: number; ocupados: number }>>({});
  const [loading, setLoading] = useState(true);
  const [savingTipo, setSavingTipo] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expiring, setExpiring] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.rol === "JEFE_URGENCIAS" && user.hospital_id) {
      setHospitalId(user.hospital_id);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cap, resList] = await Promise.all([
        api.getHospitalCapacity(token, hospitalId),
        api.getHospitalReservas(token, hospitalId),
      ]);
      setCapacity(cap);
      setReservas(resList);
      const nextEdits: Record<string, { total: number; ocupados: number }> = {};
      for (const r of cap.recursos) {
        nextEdits[r.tipo_recurso] = { total: r.total, ocupados: r.ocupados };
      }
      setEdits(nextEdits);
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Error consultando panel hospitalario.",
      });
    } finally {
      setLoading(false);
    }
  }, [token, hospitalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveResource(tipo: TipoRecurso) {
    if (!token || !edits[tipo]) return;
    setSavingTipo(tipo);
    setFeedback(null);
    try {
      const updated = await api.updateHospitalCapacity(token, hospitalId, {
        tipo_recurso: tipo,
        total: Number(edits[tipo].total),
        ocupados: Number(edits[tipo].ocupados),
      });
      setFeedback({
        kind: "ok",
        text: `Capacidad de ${updated.tipo_recurso} actualizada: ${updated.disponibles} disponibles de ${updated.total} (reservados: ${updated.reservados}).`,
      });
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setFeedback({
          kind: "error",
          text:
            err.status === 409
              ? `Conflicto de integridad (HTTP 409): ${err.message}`
              : `HTTP ${err.status}: ${err.message}`,
        });
      } else {
        setFeedback({ kind: "error", text: "Error actualizando capacidad." });
      }
    } finally {
      setSavingTipo(null);
    }
  }

  async function handleConfirmReserva(reservaId: string) {
    if (!token) return;
    setConfirmingId(reservaId);
    setFeedback(null);
    try {
      const res = await api.confirmReserva(token, reservaId);
      setFeedback({
        kind: "ok",
        text: `Reserva ${res.reserva_id.slice(0, 8)}… confirmada (traslado en estado '${res.estado_traslado}'). Ya no expirará por TTL.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof ApiError ? `HTTP ${err.status}: ${err.message}` : "Error confirmando reserva.",
      });
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleExpireOverdue() {
    if (!token) return;
    setExpiring(true);
    setFeedback(null);
    try {
      const res = await api.expireOverdueReservas(token);
      setFeedback({
        kind: "ok",
        text: `Barrido TTL ejecutado: ${res.reservas_expiradas} reserva(s) vencida(s) liberada(s) en PostgreSQL.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        kind: "error",
        text: err instanceof ApiError ? err.message : "Error ejecutando barrido TTL.",
      });
    } finally {
      setExpiring(false);
    }
  }

  return (
    <AppShell allowedRoles={["JEFE_URGENCIAS", "CRUM"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Panel Hospitalario — Jefe de Urgencias
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {capacity ? `HOSP-0${capacity.hospital_id} · ${capacity.nombre}` : "Cargando unidad hospitalaria..."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user?.rol === "CRUM" && (
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                  <option key={id} value={id}>
                    Gestionar HOSP-0{id}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={expiring}
              onClick={handleExpireOverdue}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
            >
              <TimerOff className="h-3.5 w-3.5" />
              {expiring ? "Expirando..." : "Barrido TTL vencidas"}
            </button>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Recargar
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs font-medium ${
              feedback.kind === "ok"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
            }`}
          >
            {feedback.kind === "ok" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tarjetas de capacidad editable */}
        <section className="grid gap-4 md:grid-cols-3">
          {(capacity?.recursos ?? []).map((r) => {
            const edit = edits[r.tipo_recurso] ?? { total: r.total, ocupados: r.ocupados };
            const previewDisp = edit.total - edit.ocupados - r.reservados;
            return (
              <div
                key={r.recurso_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-600" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                      {r.tipo_recurso.replace("_", " ")}
                    </h2>
                  </div>
                  <DataVintageBadge iso={r.actualizado_en} label="" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <div className="text-[10px] font-semibold uppercase text-slate-500">Disponibles (LIVE)</div>
                    <div
                      className={`mt-0.5 text-2xl font-bold tabular-nums ${
                        r.disponibles === 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {r.disponibles}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <div className="text-[10px] font-semibold uppercase text-slate-500">Reservados ACID</div>
                    <div className="mt-0.5 text-2xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                      {r.reservados}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Total</label>
                    <input
                      type="number"
                      min={0}
                      value={edit.total}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [r.tipo_recurso]: { ...edit, total: Number(e.target.value) },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Ocupados</label>
                    <input
                      type="number"
                      min={0}
                      value={edit.ocupados}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [r.tipo_recurso]: { ...edit, ocupados: Number(e.target.value) },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-mono text-slate-500">
                  Cálculo previo:{" "}
                  <strong className={previewDisp < 0 ? "text-red-600" : "text-slate-700 dark:text-slate-200"}>
                    {previewDisp} disponibles
                  </strong>{" "}
                  {previewDisp < 0 ? "(PostgreSQL rechazará con 409)" : ""}
                </div>

                <button
                  type="button"
                  disabled={savingTipo === r.tipo_recurso}
                  onClick={() => handleSaveResource(r.tipo_recurso)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingTipo === r.tipo_recurso ? "Guardando..." : "Actualizar capacidad"}
                </button>
              </div>
            );
          })}
        </section>

        {/* Listado de reservas entrantes */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Reservas Entrantes e Historial ({reservas.length})
            </h2>
            <span className="text-xs text-slate-500">Confirmar recepción bloquea la expiración TTL</span>
          </div>

          {reservas.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
              No hay reservas registradas para este hospital.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800">
                    <th className="py-2 pr-3">Protocolo / Recurso</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">ETA</th>
                    <th className="py-2 pr-3">Expira (TTL)</th>
                    <th className="py-2 pr-3">Expediente FRAP</th>
                    <th className="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reservas.map((res) => (
                    <tr key={res.reserva_id}>
                      <td className="py-2.5 pr-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {res.protocolo_codigo}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {res.tipo_recurso} × {res.cantidad}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 font-semibold uppercase ${
                            res.estado_reserva === "activa"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              : res.estado_reserva === "confirmada"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {res.estado_reserva}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        {res.eta_min != null ? `${res.eta_min} ± ${res.eta_margen_min ?? 0} min` : "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(res.expira_en)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/expedientes/${res.frap_id}`}
                          className="inline-flex items-center gap-1 font-mono text-cyan-700 hover:underline dark:text-cyan-400"
                        >
                          {res.frap_id.slice(0, 10)}…
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="py-2.5 text-right">
                        {res.estado_reserva === "activa" ? (
                          <button
                            type="button"
                            disabled={confirmingId === res.reserva_id}
                            onClick={() => handleConfirmReserva(res.reserva_id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {confirmingId === res.reserva_id ? "Confirmando..." : "Confirmar recepción"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">{res.estado_traslado}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
