"use client";

/**
 * Resultado del despacho: asignado (Figma 17:692 / 19:494) y sin asignación (17:819 / 19:554).
 * Datos de la respuesta de POST /dispatch/evaluate-and-assign; GET /network/hospitals para las claves.
 * Alternativas y descartados son solo informativos: no hay «ver otra opción» ni reevaluación.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { leerResultado, type ResultadoGuardado } from "@/components/despacho/store";
import { hospitalLabel, useNow } from "@/components/hospital";
import { EmptyState } from "@/components/states";
import {
  Alert,
  AvisoOficial,
  Card,
  cx,
  Freshness,
  Kpi,
  StatusBadge,
  Table,
  Td,
  Th,
  TriageText,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatCuentaRegresiva, formatEta, formatNumero, formatSegundos } from "@/lib/format";
import { RECURSO_LABEL, VIA_LABEL, zonaLabel } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { useQuery } from "@/lib/useQuery";
import type { DispatchEvaluateResponse, HospitalDescartado, HospitalRedItem } from "@/types/api";

export default function ResultadoPage() {
  return (
    <AppShell roles={["PARAMEDICO", "CRUM"]} narrow>
      <Resultado />
    </AppShell>
  );
}

const linkBtn =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-n-300 bg-surface px-4 py-3 text-sm font-semibold text-n-900 hover:bg-n-50 max-sm:min-h-12";

function Resultado() {
  const [r, setR] = useState<ResultadoGuardado | null | undefined>(undefined);
  const red = useQuery("red", () => api.networkHospitals());
  useEffect(() => setR(leerResultado()), []);

  if (r === undefined) return null;
  if (r === null) {
    return (
      <div className="mx-auto max-w-[900px] p-4 sm:p-6">
        <EmptyState>
          No hay una evaluación reciente en esta sesión.{" "}
          <Link href="/despacho" className="font-semibold text-link underline">
            Iniciar una evaluación
          </Link>
        </EmptyState>
      </div>
    );
  }

  const hospitales = red.data?.hospitales ?? [];
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 py-6 sm:gap-5">
      {r.respuesta.estado_despacho === "asignado" && r.respuesta.hospital_asignado ? (
        <Asignado r={r} hospitales={hospitales} />
      ) : (
        <SinAsignacion r={r} hospitales={hospitales} />
      )}
      <AvisoOficial>{r.respuesta.decision_support_notice}</AvisoOficial>
    </div>
  );
}

function Frescura({ r }: { r: ResultadoGuardado }) {
  const now = useNow(1000);
  const s = r.respuesta.data_vintage_segundos;
  if (s == null) return null;
  const total = s + Math.max(0, Math.floor((now - r.recibidoEn) / 1000));
  return <Freshness texto={`Dato más antiguo: ${formatSegundos(total)}`} />;
}

function nombreCorto(id: number, nombre: string, hospitales: HospitalRedItem[]) {
  return hospitalLabel(hospitales.find((h) => h.hospital_id === id), nombre);
}

function Asignado({ r, hospitales }: { r: ResultadoGuardado; hospitales: HospitalRedItem[] }) {
  const { user } = useSession();
  const res = r.respuesta;
  const h = res.hospital_asignado!;
  const reserva = res.reserva;
  const inc = res.incertidumbre_ruta;
  const now = useNow(1000);
  const restanteMs = reserva ? new Date(reserva.expira_en).getTime() - now : 0;
  const vencida = !!reserva && restanteMs <= 0;
  const recurso = reserva?.tipo_recurso ?? res.recurso_critico;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-cond text-2xl font-bold leading-[30px] text-n-900">
          Propuesta de destino para <span className="whitespace-nowrap font-mono text-[22px]">{r.paciente}</span>
        </h1>
        <Frescura r={r} />
      </div>

      <section className="flex flex-col gap-5 rounded-lg border-2 border-accent bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-semibold text-link">Propuesta · reserva temporal</p>
            <h2 className="font-cond text-xl font-semibold leading-[26px] text-n-900">{h.nombre}</h2>
            <p className="text-xs text-n-700">
              {h.municipio} · zona {zonaLabel(h.zona)} · nivel de atención {h.nivel_atencion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TriageText nivel={r.triage} withPrefix className="text-sm" />
            <StatusBadge>{res.estado_despacho}</StatusBadge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi
            label="ETA ± margen"
            value={formatEta(h.eta_min, h.eta_margen_min)}
            sub={
              inc.eta_minimo_min != null && inc.eta_maximo_min != null
                ? `Rango ${formatNumero(Math.round(inc.eta_minimo_min))} – ${formatNumero(Math.round(inc.eta_maximo_min))} min`
                : undefined
            }
          />
          <Kpi
            label="Recurso reservado"
            value={recurso ? `${RECURSO_LABEL[recurso]} × ${reserva?.cantidad ?? 1}` : "—"}
            sub={`Disponibles: ${h.recurso_disponible_antes} → ${h.recurso_disponible_despues}`}
          />
          <Kpi
            label="Reserva vence en"
            value={<span aria-live="off">{reserva ? formatCuentaRegresiva(restanteMs) : "—"}</span>}
            sub={reserva ? `TTL de ${reserva.ttl_minutos} min` : undefined}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-n-900">
          Estado de la vía: <StatusBadge>{VIA_LABEL[h.estado_via]}</StatusBadge>
          {h.tramo_id && <span className="font-mono text-n-700">{h.tramo_id}</span>}
        </div>
        <p className="text-xs text-n-700">Supuestos de la ruta: {inc.supuestos}</p>

        {res.alerta_concurrencia && (
          <Alert icon={<Clock className="size-5" aria-hidden />} title="Concurrencia detectada">
            Otro despacho tomó un recurso mientras se reservaba. El sistema probó con el siguiente hospital viable.
          </Alert>
        )}

        <Alert
          icon={<Clock className="size-5" aria-hidden />}
          title={vencida ? "La reserva venció" : "La reserva todavía no está confirmada"}
        >
          {vencida
            ? "Si nadie la confirmó a tiempo, el sistema la libera sola. Consulta el expediente para ver su estado."
            : user?.rol === "CRUM"
              ? "Confírmala en Consola CRUM › Reservas del hospital antes de que venza; si no, se libera sola."
              : "El CRUM o la Jefatura de Urgencias deben confirmarla antes de que venza; si no, se libera sola. Tú no puedes confirmarla desde aquí."}
        </Alert>

        <div>
          <Link href={`/expedientes/${res.frap_id}`} className={linkBtn}>
            Ver expediente
          </Link>
        </div>
      </section>

      {res.alternativas_rankeadas.length > 0 && (
        <Card title="Otras opciones evaluadas (solo informativas)">
          <Table label="Otras opciones evaluadas">
            <thead>
              <tr>
                <Th>Hospital</Th>
                <Th>ETA ± margen</Th>
                <Th>Vía</Th>
                <Th numeric>Disp.</Th>
                <Th>Guardia</Th>
              </tr>
            </thead>
            <tbody>
              {res.alternativas_rankeadas.map((a) => (
                <tr key={a.hospital_id}>
                  <Td>{nombreCorto(a.hospital_id, a.nombre, hospitales)}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatEta(a.eta_min, a.eta_margen_min)}</Td>
                  <Td>
                    <StatusBadge>{VIA_LABEL[a.estado_via]}</StatusBadge>
                  </Td>
                  <Td numeric>{a.recurso_disponibles}</Td>
                  <Td>{a.guardia_especialista_presente ? "Presente" : "Ausente"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Descartados lista={res.hospitales_descartados} hospitales={hospitales} title="Descartados y por qué" />
      {res.mensaje && <p className="text-xs text-n-700">{res.mensaje}</p>}
    </>
  );
}

function SinAsignacion({ r, hospitales }: { r: ResultadoGuardado; hospitales: HospitalRedItem[] }) {
  const res: DispatchEvaluateResponse = r.respuesta;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-cond text-2xl font-bold leading-[30px] text-n-900">
          Sin asignación para <span className="whitespace-nowrap font-mono text-[22px]">{r.paciente}</span>
        </h1>
        <div className="flex items-center gap-2">
          <Frescura r={r} />
          <StatusBadge>sin asignación</StatusBadge>
        </div>
      </div>

      <Alert icon={<AlertTriangle className="size-5" aria-hidden />} title="No se concretó una reserva" role="alert">
        {res.motivo_sin_asignacion ?? res.mensaje}
      </Alert>

      {res.alerta_concurrencia && (
        <Alert icon={<Clock className="size-5" aria-hidden />} title="Concurrencia detectada">
          Otro despacho tomó el último recurso mientras se reservaba. El sistema probó con el siguiente hospital viable y
          ninguno quedó disponible.
        </Alert>
      )}

      <Card>
        <p className="text-sm font-semibold text-n-900">
          El FRAP quedó guardado en estado sin_asignacion. Se requiere intervención del CRUM.
        </p>
        <p className="text-sm text-n-700">
          No se reservó ningún recurso. Avisa al CRUM por tus canales habituales y comparte el identificador del FRAP.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-subtle p-3">
          <span className="break-all font-mono text-[13px] font-medium text-n-900">FRAP {res.frap_id}</span>
          <Link href={`/expedientes/${res.frap_id}`} className={linkBtn}>
            Ver expediente
          </Link>
        </div>
      </Card>

      <Descartados lista={res.hospitales_descartados} hospitales={hospitales} title="Hospitales descartados y por qué" />
    </>
  );
}

function Descartados({
  lista,
  hospitales,
  title,
}: {
  lista: HospitalDescartado[];
  hospitales: HospitalRedItem[];
  title: string;
}) {
  if (lista.length === 0) return null;
  return (
    <Card title={title}>
      <ul className="-mt-1 flex flex-col gap-2">
        {lista.map((d) => (
          <li key={d.hospital_id} className={cx("flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-6")}>
            <span className="font-semibold text-n-900">{nombreCorto(d.hospital_id, d.nombre, hospitales)}</span>
            <span className="text-n-700 sm:text-right">{d.motivos_descarte.join(" · ")}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
