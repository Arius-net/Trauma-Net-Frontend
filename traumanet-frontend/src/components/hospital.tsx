"use client";

/** Bloques compartidos por Consola CRUM y Panel de Urgencias. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isApiError } from "@/lib/api";
import { formatEta, formatHace, formatRestante } from "@/lib/format";
import { PROTOCOLOS, RECURSO_LABEL, VIA_LABEL, ESTADOS_VIA, zonaLabel } from "@/lib/labels";
import { useQuery } from "@/lib/useQuery";
import { useNotify } from "@/components/Notifications";
import { EmptyState, QueryView } from "@/components/states";
import { Button, Card, Field, Segmented, Select, StatusBadge, Table, Td, Th } from "@/components/ui";
import type {
  CascadeDerivationResponse,
  EstadoVia,
  HospitalRedItem,
  ProtocoloCodigo,
  RecursoResumen,
  ReservaHospitalItem,
} from "@/types/api";

export function hospitalLabel(h: Pick<HospitalRedItem, "clave" | "nombre"> | undefined, fallback?: string): string {
  if (!h) return fallback ?? "—";
  return `${h.clave} · ${h.nombre}`;
}

/** Re-render periódico para cuentas regresivas y «hace N s». */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Fecha más antigua de actualizado_en entre todos los recursos. */
export function oldestUpdate(recursos: RecursoResumen[]): string | null {
  let min: number | null = null;
  for (const r of recursos) {
    const t = new Date(r.actualizado_en).getTime();
    if (!Number.isNaN(t) && (min === null || t < min)) min = t;
  }
  return min === null ? null : new Date(min).toISOString();
}

/* ---------- Estado de vía por tramo (solo CRUM) ---------- */
interface Tramo {
  tramo_id: string;
  zonas: [string, string];
  estado_via: EstadoVia;
}

/** Tramos interzona tomados de las conexiones de la API (no fijos en código). */
export function tramosDeRed(hospitales: HospitalRedItem[]): Tramo[] {
  const zonaDe = new Map(hospitales.map((h) => [h.hospital_id, h.zona]));
  const out = new Map<string, Tramo>();
  for (const h of hospitales) {
    for (const c of h.conexiones) {
      const zb = zonaDe.get(c.destino_hospital_id);
      if (!zb || zb === h.zona || out.has(c.tramo_id)) continue;
      out.set(c.tramo_id, { tramo_id: c.tramo_id, zonas: [h.zona, zb], estado_via: c.estado_via });
    }
  }
  return [...out.values()];
}

export function EstadoViaCard({ hospitales, onChanged }: { hospitales: HospitalRedItem[]; onChanged: () => void }) {
  const notify = useNotify();
  const [tramos, setTramos] = useState<Tramo[]>(() => tramosDeRed(hospitales));
  const [pendiente, setPendiente] = useState<string | null>(null);

  useEffect(() => setTramos(tramosDeRed(hospitales)), [hospitales]);

  async function cambiar(t: Tramo, estado: EstadoVia) {
    if (pendiente || estado === t.estado_via) return;
    setPendiente(t.tramo_id);
    try {
      const res = await api.updateTramo(t.tramo_id, estado);
      setTramos((prev) => prev.map((x) => (x.tramo_id === res.tramo_id ? { ...x, estado_via: res.estado_via } : x)));
      notify(
        "Vía actualizada",
        `${res.tramo_id} pasó a ${VIA_LABEL[res.estado_via].toLowerCase()}. Se aplicará a los próximos cálculos de ETA.`
      );
      onChanged();
    } catch (e) {
      if (isApiError(e) && (e.kind === "network" || e.kind === "unauthorized")) return;
      notify("No se pudo actualizar la vía", isApiError(e) ? e.message : undefined);
    } finally {
      setPendiente(null);
    }
  }

  return (
    <Card title="Estado de vía por tramo" className="lg:w-[420px] lg:shrink-0">
      <p className="text-sm text-n-700">
        Solo el CRUM puede cambiarlo. Afecta el cálculo de ETA de todos los despachos: demora penaliza el tiempo;
        bloqueo excluye la ruta.
      </p>
      {tramos.length === 0 && <EmptyState>La API no devolvió tramos entre zonas.</EmptyState>}
      {tramos.map((t) => (
        <div key={t.tramo_id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-[13px] font-medium text-n-900">{t.tramo_id}</span>
              <span className="text-xs text-n-700">
                {zonaLabel(t.zonas[0])} ↔ {zonaLabel(t.zonas[1])}
              </span>
            </div>
            <StatusBadge>{VIA_LABEL[t.estado_via]}</StatusBadge>
          </div>
          <Segmented
            label={`Cambiar estado de ${t.tramo_id}`}
            hideLabel
            tone="fill"
            value={t.estado_via}
            disabled={pendiente !== null}
            onChange={(v) => cambiar(t, v)}
            options={ESTADOS_VIA.map((v) => ({ value: v, label: VIA_LABEL[v] }))}
          />
        </div>
      ))}
    </Card>
  );
}

/* ---------- Derivación en cascada (Decisión 2) ---------- */
export function CascadaCard({
  hospitales,
  hospitalFijo,
  title = "Derivación en cascada (Decisión 2)",
}: {
  hospitales: HospitalRedItem[];
  /** Si se da, el hospital saturado es este (Jefe de Urgencias). */
  hospitalFijo?: number;
  title?: string;
}) {
  const [hospitalId, setHospitalId] = useState<number>(hospitalFijo ?? hospitales[0]?.hospital_id ?? 1);
  const [protocolo, setProtocolo] = useState<ProtocoloCodigo>(hospitalFijo ? "PT-POLITRAUMA" : "PT-TCE");
  const [consulta, setConsulta] = useState<{ h: number; p: ProtocoloCodigo; n: number } | null>(null);
  const byId = new Map(hospitales.map((h) => [h.hospital_id, h]));

  const q = useQuery<CascadeDerivationResponse>(
    consulta ? `cascada:${consulta.h}:${consulta.p}:${consulta.n}` : null,
    () => api.cascade(consulta!.h, consulta!.p)
  );

  return (
    <Card title={title} className="flex-1">
      {!hospitalFijo && (
        <p className="text-sm text-n-700">
          Propone hospitales vecinos compatibles cuando un hospital está saturado. Es una propuesta: no reserva recursos.
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setConsulta((c) => ({ h: hospitalFijo ?? hospitalId, p: protocolo, n: (c?.n ?? 0) + 1 }));
        }}
      >
        {!hospitalFijo && (
          <Field label="Hospital saturado" className="min-w-[200px] flex-1">
            {({ id }) => (
              <Select id={id} value={hospitalId} onChange={(e) => setHospitalId(Number(e.target.value))}>
                {hospitales.map((h) => (
                  <option key={h.hospital_id} value={h.hospital_id}>
                    {hospitalLabel(h)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Protocolo" className="min-w-[180px] flex-1">
          {({ id }) => (
            <Select id={id} value={protocolo} onChange={(e) => setProtocolo(e.target.value as ProtocoloCodigo)}>
              {PROTOCOLOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" loading={q.loading} className="max-lg:w-full lg:ml-auto">
          Buscar derivación
        </Button>
      </form>

      {!consulta && hospitalFijo && (
        <p className="text-xs text-n-700">
          Muestra hospitales vecinos compatibles, su ETA ± margen, estado de vía y si son viables. No reserva nada.
        </p>
      )}

      {consulta && (
        <QueryView query={q} skeletonCols={6} skeletonRows={3}>
          {(data) =>
            data.opciones_derivacion.length === 0 ? (
              <EmptyState>No hay hospitales vecinos compatibles para este protocolo.</EmptyState>
            ) : (
              <>
                <Table label="Opciones de derivación">
                  <thead>
                    <tr>
                      <Th>Hospital</Th>
                      <Th>Tramo</Th>
                      <Th>ETA ± margen</Th>
                      <Th>Vía</Th>
                      <Th numeric>{RECURSO_LABEL[data.recurso_critico]}</Th>
                      <Th>Viable</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.opciones_derivacion.map((o) => (
                      <tr key={o.hospital_id}>
                        <Td>{hospitalLabel(byId.get(o.hospital_id), o.nombre)}</Td>
                        <Td mono className="whitespace-nowrap">{o.tramo_id}</Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatEta(o.eta_min, o.eta_margen_min)}</Td>
                        <Td>
                          <StatusBadge>{VIA_LABEL[o.estado_via]}</StatusBadge>
                        </Td>
                        <Td numeric>{o.recurso_disponibles}</Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1 py-1">
                            <StatusBadge>{o.viable ? "viable" : "no viable"}</StatusBadge>
                            {!o.viable && o.motivo_no_viable && (
                              <span className="text-xs text-n-700">{o.motivo_no_viable}</span>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <p className="text-xs text-n-700">
                  Recurso crítico: {RECURSO_LABEL[data.recurso_critico]} · Orden: viables primero, luego por ETA.
                  {data.data_vintage && ` Dato más antiguo: ${formatHace(data.data_vintage)}.`}
                </p>
              </>
            )
          }
        </QueryView>
      )}
    </Card>
  );
}

/* ---------- Tabla de reservas con Confirmar ---------- */
export function ReservasTable({
  reservas,
  onConfirmed,
}: {
  reservas: ReservaHospitalItem[];
  onConfirmed: (r: ReservaHospitalItem) => void;
}) {
  const notify = useNotify();
  const now = useNow(15000);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function confirmar(r: ReservaHospitalItem) {
    if (pendiente) return;
    setPendiente(r.reserva_id);
    try {
      const res = await api.confirmReserva(r.reserva_id);
      onConfirmed({
        ...r,
        estado_reserva: res.estado_reserva as ReservaHospitalItem["estado_reserva"],
        estado_traslado: res.estado_traslado,
        cerrada_en: res.cerrada_en,
      });
      notify("Reserva confirmada", `${RECURSO_LABEL[r.tipo_recurso]} para el FRAP ${r.frap_id}. Ya no expira por TTL.`);
    } catch (e) {
      if (isApiError(e) && (e.kind === "network" || e.kind === "unauthorized")) return;
      notify("No se pudo confirmar la reserva", isApiError(e) ? e.message : undefined);
    } finally {
      setPendiente(null);
    }
  }

  if (reservas.length === 0) return <EmptyState>Este hospital no tiene reservas entrantes ni históricas.</EmptyState>;

  return (
    <Table label="Reservas">
      <thead>
        <tr>
          <Th>FRAP</Th>
          <Th>Recurso</Th>
          <Th>Protocolo</Th>
          <Th>ETA ± margen</Th>
          <Th>Reserva</Th>
          <Th>Expira</Th>
          <Th>
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {reservas.map((r) => (
          <tr key={r.reserva_id}>
            <Td mono>
              <Link href={`/expedientes/${r.frap_id}`} className="text-link underline-offset-2 hover:underline">
                {r.frap_id}
              </Link>
            </Td>
            <Td>
              {RECURSO_LABEL[r.tipo_recurso] ?? r.tipo_recurso}
              {r.cantidad > 1 && ` × ${r.cantidad}`}
            </Td>
            <Td className="font-mono text-[13px]">{r.protocolo_codigo}</Td>
            <Td className="whitespace-nowrap tabular-nums">{formatEta(r.eta_min, r.eta_margen_min)}</Td>
            <Td>
              <StatusBadge>{r.estado_reserva}</StatusBadge>
            </Td>
            <Td className="whitespace-nowrap">{r.estado_reserva === "activa" ? formatRestante(r.expira_en, now) : "—"}</Td>
            <Td className="py-1">
              {r.estado_reserva === "activa" && (
                <Button
                  variant="secondary"
                  onClick={() => confirmar(r)}
                  loading={pendiente === r.reserva_id}
                  disabled={pendiente !== null && pendiente !== r.reserva_id}
                >
                  Confirmar
                </Button>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Botón «Expirar reservas vencidas» (POST /reservas/expire-overdue). */
export function ExpirarButton({ onDone }: { onDone: () => void }) {
  const notify = useNotify();
  const [enviando, setEnviando] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={enviando}
      onClick={async () => {
        if (enviando) return;
        setEnviando(true);
        try {
          const res = await api.expireOverdue();
          notify(
            "Reservas vencidas liberadas",
            res.reservas_expiradas === 0
              ? "No había reservas activas vencidas."
              : `Se liberaron ${res.reservas_expiradas} reserva${res.reservas_expiradas === 1 ? "" : "s"} vencida${res.reservas_expiradas === 1 ? "" : "s"}.`
          );
          onDone();
        } catch (e) {
          if (isApiError(e) && (e.kind === "network" || e.kind === "unauthorized")) return;
          notify("No se pudieron expirar las reservas", isApiError(e) ? e.message : undefined);
        } finally {
          setEnviando(false);
        }
      }}
    >
      Expirar reservas vencidas
    </Button>
  );
}
