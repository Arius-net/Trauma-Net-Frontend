"use client";

/**
 * Expediente — detalle (Figma 17:473). GET /expedientes/{frap_id} (+ GET /network/hospitals para la clave).
 */
import { useParams } from "next/navigation";
import { Activity } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { hospitalLabel } from "@/components/hospital";
import { QueryView } from "@/components/states";
import {
  Alert,
  AvisoOficial,
  Card,
  DataRow,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
  TriageText,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatEta, formatFecha, formatHace, formatHora, formatNumero, formatRestante } from "@/lib/format";
import {
  INCIDENTE_LABEL,
  MECANISMO_LABEL,
  RECURSO_LABEL,
  REGION_LABEL,
  siNo,
  VIA_LABEL,
} from "@/lib/labels";
import { useQuery } from "@/lib/useQuery";
import type { FrapDocumento, PerfilClinico, TrasladoExpediente } from "@/types/api";

export default function ExpedienteDetallePage() {
  return (
    <AppShell roles={["CRUM", "JEFE_URGENCIAS", "PARAMEDICO"]}>
      <Detalle />
    </AppShell>
  );
}

function Detalle() {
  const params = useParams<{ frap_id: string }>();
  const frapId = decodeURIComponent(params.frap_id);
  const q = useQuery(`expediente:${frapId}`, () => api.expediente(frapId));
  const red = useQuery("red", () => api.networkHospitals());
  const hosp = (id: number | undefined) => red.data?.hospitales.find((h) => h.hospital_id === id);

  const f = q.data?.frap;
  const subtitulo = f
    ? [f.paciente_sintetico?.id_sintetico, f.tipo_incidente ? INCIDENTE_LABEL[f.tipo_incidente] : null]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <>
      <PageHeader
        title={
          <>
            Expediente <span className="font-mono text-[22px] font-semibold">{frapId}</span>
          </>
        }
        subtitle={subtitulo}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <QueryView query={q} skeletonCols={4} skeletonRows={8}>
          {(data) => (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-6">
                <PacienteCard f={data.frap} />
                <SignosCard f={data.frap} />
                {data.frap.perfil && <PerfilCard perfil={data.frap.perfil} />}
                {(data.frap.medicamentos_aplicados?.length || data.frap.notas) && <NotasCard f={data.frap} />}
              </div>
              <div className="flex flex-col gap-6 lg:w-[440px] lg:shrink-0">
                {data.traslado ? (
                  <>
                    <TrasladoCard
                      t={data.traslado}
                      estadoFrap={data.frap.estado_frap}
                      label={hospitalLabel(hosp(data.traslado.hospital_destino_id), data.traslado.hospital_destino_nombre)}
                    />
                    <ReservasTrasladoCard t={data.traslado} />
                  </>
                ) : (
                  <SinTraslado f={data.frap} />
                )}
              </div>
            </div>
          )}
        </QueryView>
        <AvisoOficial />
      </div>
    </>
  );
}

function PacienteCard({ f }: { f: FrapDocumento }) {
  const p = f.paciente_sintetico;
  const u = f.ubicacion_escena;
  return (
    <Card title="Paciente y escena">
      <dl className="-mt-2">
        <DataRow label="ID sintético">
          <span className="font-mono">{p?.id_sintetico ?? "—"}</span>
        </DataRow>
        <DataRow label="Sexo / grupo de edad">
          {p ? `${p.sexo} · ${p.grupo_edad.replace("_", " ")}` : "—"}
        </DataRow>
        <DataRow label="Municipio">{u?.municipio ?? "—"}</DataRow>
        <DataRow label="Latitud, longitud">
          <span className="font-mono">{u ? `${u.latitud.toFixed(4)}, ${u.longitud.toFixed(4)}` : "—"}</span>
        </DataRow>
        <DataRow label="Tramo">
          <span className="font-mono">{u?.tramo_id || "—"}</span>
        </DataRow>
        <DataRow label="Referencia">{u?.referencia || "—"}</DataRow>
        <DataRow label="Ambulancia">{f.ambulancia_id ?? "—"}</DataRow>
        <DataRow label="Creado">{formatFecha(f.creado_en)}</DataRow>
      </dl>
    </Card>
  );
}

function SignosCard({ f }: { f: FrapDocumento }) {
  const sv = f.signos_vitales ?? [];
  return (
    <Card title="Triage y signos vitales" actions={<TriageText nivel={f.triage?.nivel} withPrefix className="text-sm" />}>
      {f.triage?.observaciones && <p className="text-sm text-n-700">{f.triage.observaciones}</p>}
      <Table label="Signos vitales">
        <thead>
          <tr>
            <Th>Medido</Th>
            <Th numeric>FC</Th>
            <Th numeric>FR</Th>
            <Th numeric>TA</Th>
            <Th numeric>SpO₂</Th>
            <Th numeric>Temp.</Th>
            <Th numeric>Glucosa</Th>
          </tr>
        </thead>
        <tbody>
          {sv.map((s, i) => (
            <tr key={i}>
              <Td>{formatHora(s.medido_en)}</Td>
              <Td numeric>{s.fc}</Td>
              <Td numeric>{s.fr}</Td>
              <Td numeric>
                {s.ta_sistolica}/{s.ta_diastolica}
              </Td>
              <Td numeric>{s.spo2} %</Td>
              <Td numeric>{formatNumero(s.temperatura_c, " °C")}</Td>
              <Td numeric>{formatNumero(s.glucosa_mgdl, " mg/dL")}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function PerfilCard({ perfil }: { perfil: PerfilClinico }) {
  let filas: [string, React.ReactNode][] = [];
  switch (perfil.tipo) {
    case "politrauma":
      filas = [
        ["Mecanismo", MECANISMO_LABEL[perfil.mecanismo_lesion] ?? perfil.mecanismo_lesion],
        ["Hemorragia activa", siNo(perfil.hemorragia_activa)],
        ["Torniquete aplicado", siNo(perfil.torniquete_aplicado)],
        ["Quirófano sospechado", siNo(perfil.requiere_quirofano_sospechado)],
        ["ISS estimado", perfil.iss_estimado ?? "—"],
        [
          "Lesiones",
          perfil.lesiones
            .map((l) => `${REGION_LABEL[l.region] ?? l.region} · ${l.tipo_lesion} (AIS ${l.ais})`)
            .join(" · "),
        ],
      ];
      break;
    case "infarto_agudo":
      filas = [
        ["Elevación del ST", siNo(perfil.ecg.elevacion_st)],
        ["Derivaciones afectadas", perfil.ecg.derivaciones_afectadas.join(", ") || "—"],
        ["Ritmo", perfil.ecg.ritmo?.replaceAll("_", " ") ?? "—"],
        ["Killip", perfil.killip],
        ["Inicio del dolor", `${perfil.inicio_dolor_min} min`],
        ["Trombólisis aplicada", siNo(perfil.trombolisis_aplicada)],
        ["Troponina rápida positiva", siNo(perfil.troponina_rapida_positiva)],
      ];
      break;
    case "trauma_craneoencefalico":
      filas = [
        [
          "Glasgow",
          `${perfil.glasgow.total} (O${perfil.glasgow.ocular} V${perfil.glasgow.verbal} M${perfil.glasgow.motor})`,
        ],
        ["Pupilas (izq. / der.)", `${perfil.pupilas.izquierda_mm} mm / ${perfil.pupilas.derecha_mm} mm`],
        ["Pupilas reactivas", siNo(perfil.pupilas.reactivas)],
        ["Signos de herniación", siNo(perfil.signos_herniacion)],
        ["Vía aérea asegurada", siNo(perfil.via_aerea_asegurada)],
        ["Anticoagulado", siNo(perfil.anticoagulado)],
        ["Convulsiones", siNo(perfil.convulsiones)],
      ];
      break;
    case "intoxicacion_quemaduras":
      filas = [
        ["Subtipo", perfil.subtipo],
        ["Agente", perfil.agente || "—"],
        ["Vía de exposición", perfil.via_exposicion ?? "—"],
        ["SCT quemada", perfil.sct_quemada_pct != null ? `${perfil.sct_quemada_pct} %` : "—"],
        ["Grado de quemadura", perfil.grado_quemadura ?? "—"],
        ["Lesión inhalatoria", siNo(perfil.lesion_inhalatoria)],
        ["Vía aérea comprometida", siNo(perfil.via_aerea_comprometida)],
        ["Descontaminación realizada", siNo(perfil.descontaminacion_realizada)],
        ["Antídoto aplicado", perfil.antidoto_aplicado || "—"],
      ];
      break;
  }
  return (
    <Card title={`Perfil clínico · ${INCIDENTE_LABEL[perfil.tipo].toLowerCase()}`}>
      <dl className="-mt-2">
        {filas.map(([k, v]) => (
          <DataRow key={k} label={k}>
            {v}
          </DataRow>
        ))}
      </dl>
    </Card>
  );
}

function NotasCard({ f }: { f: FrapDocumento }) {
  return (
    <Card title="Medicamentos y notas">
      <dl className="-mt-2">
        {(f.medicamentos_aplicados ?? []).map((m, i) => (
          <DataRow key={i} label={`${m.nombre} · ${m.via}`}>
            {m.dosis} · {formatHora(m.aplicado_en)}
          </DataRow>
        ))}
      </dl>
      {f.notas && <p className="whitespace-pre-wrap text-sm text-n-900">{f.notas}</p>}
    </Card>
  );
}

function TrasladoCard({ t, estadoFrap, label }: { t: TrasladoExpediente; estadoFrap?: string; label: string }) {
  return (
    <Card title="Traslado (PostgreSQL)" actions={estadoFrap ? <StatusBadge>{estadoFrap}</StatusBadge> : undefined}>
      <p className="-mt-1 text-base font-semibold text-link">{label}</p>
      <dl className="-mt-2">
        <DataRow label="Estado del traslado">{t.estado}</DataRow>
        <DataRow label="Protocolo">
          <span className="font-mono">{t.protocolo_codigo}</span>
        </DataRow>
        <DataRow label="ETA ± margen">{formatEta(t.eta_min, t.eta_margen_min)}</DataRow>
        <DataRow label="Ambulancia">{t.ambulancia_id ?? "—"}</DataRow>
        <DataRow label="Dato de capacidad">{formatHace(t.data_vintage)}</DataRow>
      </dl>
      {t.estado_via && (
        <p className="flex items-center gap-2 text-xs text-n-900">
          Estado de la vía al calcular: <StatusBadge>{VIA_LABEL[t.estado_via] ?? t.estado_via}</StatusBadge>
        </p>
      )}
    </Card>
  );
}

function ReservasTrasladoCard({ t }: { t: TrasladoExpediente }) {
  return (
    <Card title="Reservas del traslado">
      {t.reservas.length === 0 && <p className="text-sm text-n-700">El traslado no tiene reservas registradas.</p>}
      {t.reservas.map((r) => (
        <dl key={r.reserva_id} className="-mt-2">
          <DataRow label="Recurso">
            {RECURSO_LABEL[r.tipo_recurso] ?? r.tipo_recurso} × {r.cantidad}
          </DataRow>
          <DataRow label="Estado">{r.estado}</DataRow>
          <DataRow label="Creada">{formatFecha(r.creada_en)}</DataRow>
          <DataRow label={r.estado === "activa" ? "Expira" : "Cerrada"}>
            {r.estado === "activa"
              ? `${formatHora(r.expira_en)} (${formatRestante(r.expira_en)})`
              : formatFecha(r.cerrada_en)}
          </DataRow>
        </dl>
      ))}
    </Card>
  );
}

function SinTraslado({ f }: { f: FrapDocumento }) {
  return (
    <>
      <Card title="Traslado" actions={f.estado_frap ? <StatusBadge>{f.estado_frap}</StatusBadge> : undefined}>
        {f.motivo_sin_asignacion ? (
          <dl className="-mt-2">
            <DataRow label="Motivo">{f.motivo_sin_asignacion}</DataRow>
          </dl>
        ) : (
          <p className="text-sm text-n-700">Este FRAP no tiene traslado registrado.</p>
        )}
      </Card>
      <Alert icon={<Activity className="size-5" aria-hidden />} title="El FRAP no tiene traslado">
        En estado sin_asignacion no existe traslado ni reservas. El CRUM debe intervenir para coordinar el destino.
      </Alert>
    </>
  );
}
