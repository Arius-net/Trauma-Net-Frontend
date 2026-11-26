"use client";

/**
 * Panel de Urgencias (Figma 16:1015). Jefe de Urgencias (su hospital) y CRUM (cualquier hospital).
 * GET/PUT /hospitals/{id}/capacity · GET /hospitals/{id}/reservas · POST /reservas/{id}/confirm
 * POST /reservas/expire-overdue · GET /network/cascade · GET /network/hospitals
 */
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CascadaCard, ExpirarButton, hospitalLabel, ReservasTable, useNow } from "@/components/hospital";
import { useNotify } from "@/components/Notifications";
import { QueryView } from "@/components/states";
import { AvisoOficial, Button, Card, Field, Input, Kpi, PageHeader, Select } from "@/components/ui";
import { api, isApiError } from "@/lib/api";
import { formatRestante } from "@/lib/format";
import { RECURSO_LABEL, TIPOS_RECURSO } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/useQuery";
import type { HospitalCapacityResponse, RecursoResumen, ReservaHospitalItem, TipoRecurso } from "@/types/api";

export default function UrgenciasPage() {
  return (
    <AppShell roles={["JEFE_URGENCIAS", "CRUM"]}>
      <Panel />
    </AppShell>
  );
}

function plural(n: number, s: string, p: string) {
  return `${n} ${n === 1 ? s : p}`;
}

function Panel() {
  const { user } = useSession();
  const esJefe = user?.rol === "JEFE_URGENCIAS";
  const red = useQuery("red", () => api.networkHospitals());
  const [hospitalCrum, setHospitalCrum] = useState<number>(1);
  const hospitalId = esJefe ? (user?.hospital_id ?? null) : hospitalCrum;

  const capacidad = useQuery(hospitalId ? `cap:${hospitalId}` : null, () => api.capacity(hospitalId!));
  const reservas = useQuery(hospitalId ? `res:${hospitalId}` : null, () => api.reservas(hospitalId!));
  const now = useNow(15000);

  const hospital = red.data?.hospitales.find((h) => h.hospital_id === hospitalId);
  const subtitulo = hospital
    ? hospitalLabel(hospital)
    : (capacidad.data?.nombre ?? user?.hospital_nombre ?? "");

  if (esJefe && !user?.hospital_id) {
    return (
      <div className="p-6">
        <p className="text-sm text-n-700">Tu usuario no tiene un hospital asignado. Avisa al CRUM.</p>
      </div>
    );
  }

  const activas = (reservas.data ?? []).filter((r) => r.estado_reserva === "activa");
  const proxima = activas
    .map((r) => r.expira_en)
    .sort()
    .at(0);

  return (
    <>
      <PageHeader
        title="Panel de Urgencias"
        subtitle={subtitulo}
        right={
          !esJefe && red.data ? (
            <Field label="Hospital" className="w-full sm:w-[320px]">
              {({ id }) => (
                <Select id={id} value={hospitalCrum} onChange={(e) => setHospitalCrum(Number(e.target.value))}>
                  {red.data!.hospitales.map((h) => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {hospitalLabel(h)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <QueryView
          query={capacidad}
          skeleton={<div className="tn-skeleton h-[112px] w-full" aria-label="Cargando capacidad" />}
        >
          {(cap) => (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {(["quirofano", "cama_uci", "sala_choque"] as TipoRecurso[]).map((t) => {
                const r = cap.recursos.find((x) => x.tipo_recurso === t);
                const fem = t === "cama_uci" || t === "sala_choque";
                return (
                  <Kpi
                    key={t}
                    label={`${RECURSO_LABEL[t]} disponible`}
                    value={r ? `${r.disponibles} / ${r.total}` : "—"}
                    sub={
                      r
                        ? `${plural(r.ocupados, fem ? "ocupada" : "ocupado", fem ? "ocupadas" : "ocupados")} · ${plural(r.reservados, fem ? "reservada" : "reservado", fem ? "reservadas" : "reservados")}`
                        : "Sin registro"
                    }
                  />
                );
              })}
              <Kpi
                label="Reservas activas"
                value={reservas.data ? activas.length : "—"}
                sub={proxima ? `Vence ${formatRestante(proxima, now)}` : "Sin reservas por vencer"}
              />
            </div>
          )}
        </QueryView>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {capacidad.data && hospitalId && (
            <CapacidadForm
              key={`cap-${hospitalId}`}
              hospitalId={hospitalId}
              capacidad={capacidad.data}
              esJefe={esJefe}
              onSaved={(r) =>
                capacidad.setData((prev) =>
                  prev ? { ...prev, recursos: prev.recursos.map((x) => (x.tipo_recurso === r.tipo_recurso ? r : x)) } : prev
                )
              }
            />
          )}
          {red.data && hospitalId && (
            <CascadaCard
              key={`cascada-${hospitalId}`}
              hospitales={red.data.hospitales}
              hospitalFijo={hospitalId}
              title="Derivación en cascada desde este hospital"
            />
          )}
        </div>

        <Card
          title="Reservas entrantes e históricas"
          subtitle="Confirma las reservas activas antes de que venzan; si nadie las confirma, se liberan solas."
          actions={
            <ExpirarButton
              onDone={() => {
                reservas.reload();
                capacidad.reload();
              }}
            />
          }
        >
          <QueryView query={reservas} skeletonCols={7} skeletonRows={3}>
            {(data) => (
              <ReservasTable
                reservas={data}
                onConfirmed={(r: ReservaHospitalItem) =>
                  reservas.setData((prev) => prev?.map((x) => (x.reserva_id === r.reserva_id ? r : x)))
                }
              />
            )}
          </QueryView>
        </Card>

        <AvisoOficial />
      </div>
    </>
  );
}

function entero(v: string): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  return Number(v);
}

function CapacidadForm({
  hospitalId,
  capacidad,
  esJefe,
  onSaved,
}: {
  hospitalId: number;
  capacidad: HospitalCapacityResponse;
  esJefe: boolean;
  onSaved: (r: RecursoResumen) => void;
}) {
  const notify = useNotify();
  const disponiblesTipos = useMemo(
    () => TIPOS_RECURSO.filter((t) => capacidad.recursos.some((r) => r.tipo_recurso === t)),
    [capacidad]
  );
  const [tipo, setTipo] = useState<TipoRecurso>(disponiblesTipos[0] ?? "quirofano");
  const actual = capacidad.recursos.find((r) => r.tipo_recurso === tipo);
  const [total, setTotal] = useState(String(actual?.total ?? 0));
  const [ocupados, setOcupados] = useState(String(actual?.ocupados ?? 0));
  const [enviando, setEnviando] = useState(false);

  // Al cambiar de recurso se cargan sus valores actuales.
  useEffect(() => {
    const r = capacidad.recursos.find((x) => x.tipo_recurso === tipo);
    setTotal(String(r?.total ?? 0));
    setOcupados(String(r?.ocupados ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const t = entero(total);
  const o = entero(ocupados);
  const reservados = actual?.reservados ?? 0;
  const resultantes = t !== null && o !== null ? t - o - reservados : null;
  const errTotal = t === null ? "Entero ≥ 0" : null;
  const errOcupados = o === null ? "Entero ≥ 0" : null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || t === null || o === null) return;
    setEnviando(true);
    try {
      const r = await api.updateCapacity(hospitalId, { tipo_recurso: tipo, total: t, ocupados: o });
      onSaved(r);
      notify("Capacidad guardada", `${RECURSO_LABEL[tipo]}: ${r.disponibles} disponibles de ${r.total}.`);
    } catch (err) {
      if (isApiError(err) && err.kind === "conflict") {
        notify(
          "Cambio rechazado (409)",
          "Total − ocupados − reservados no puede ser menor que 0. Ajusta los valores o espera a que se liberen reservas."
        );
      } else if (isApiError(err) && (err.kind === "network" || err.kind === "unauthorized")) {
        /* ya notificado */
      } else {
        notify("No se pudo guardar la capacidad", isApiError(err) ? err.message : undefined);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card title="Actualizar capacidad" className="lg:w-[420px] lg:shrink-0">
      <p className="text-sm text-n-700">
        {esJefe ? "Solo puedes modificar tu propio hospital. " : ""}Registra total y ocupados; reservados los calcula el
        sistema.
      </p>
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <Field label="Tipo de recurso">
          {({ id }) => (
            <Select id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoRecurso)}>
              {disponiblesTipos.map((x) => (
                <option key={x} value={x}>
                  {RECURSO_LABEL[x]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total" help="Entero ≥ 0" error={errTotal}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                inputMode="numeric"
                aria-describedby={describedBy}
                invalid={invalid}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            )}
          </Field>
          <Field label="Ocupados" help="Entero ≥ 0" error={errOcupados}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                inputMode="numeric"
                aria-describedby={describedBy}
                invalid={invalid}
                value={ocupados}
                onChange={(e) => setOcupados(e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-wrap justify-between gap-2 rounded-md bg-subtle px-3 py-3 text-sm" aria-live="polite">
          <span className="text-n-700">Reservados (sistema): {reservados}</span>
          <span className="font-semibold text-n-900">
            Disponibles resultantes: {resultantes ?? "—"}
          </span>
        </div>
        {resultantes !== null && resultantes < 0 && (
          <p className="text-xs text-n-700">
            Con estos valores los disponibles quedan negativos; el sistema rechazará el cambio.
          </p>
        )}
        <Button type="submit" block loading={enviando} disabled={t === null || o === null}>
          Guardar capacidad
        </Button>
      </form>
    </Card>
  );
}
