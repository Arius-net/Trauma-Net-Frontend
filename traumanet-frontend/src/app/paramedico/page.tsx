"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Clock,
  ExternalLink,
  Send,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DataVintageBadge, EstadoViaBadge, TriageBadge } from "@/components/StatusBadges";
import { api, ApiError, formatDateTime } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  DispatchEvaluateResponse,
  NivelTriage,
  ProtocoloCodigo,
  TipoIncidente,
  ZonaCorredor,
} from "@/types/api";

const PROTOCOLO_POR_TIPO: Record<TipoIncidente, ProtocoloCodigo> = {
  politrauma: "PT-POLITRAUMA",
  infarto_agudo: "PT-IAM",
  trauma_craneoencefalico: "PT-TCE",
  intoxicacion_quemaduras: "PT-INTOX-QUEM",
};

const DERIVACIONES_ECG = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

function generateSynId(): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `SYN-${n}`;
}

export default function ParamedicoPage() {
  const { token } = useAuth();

  // Núcleo común del FRAP
  const [tipoIncidente, setTipoIncidente] = useState<TipoIncidente>("trauma_craneoencefalico");
  const [synId, setSynId] = useState<string>("SYN-700101");
  const [sexo, setSexo] = useState<"F" | "M" | "indeterminado">("M");
  const [grupoEdad, setGrupoEdad] = useState<"pediatrico" | "adulto" | "adulto_mayor">("adulto");
  const [municipio, setMunicipio] = useState<string>("Comitán de Domínguez");
  const [origenZona, setOrigenZona] = useState<ZonaCorredor>("comitan");
  const [lat, setLat] = useState<number>(16.251);
  const [lon, setLon] = useState<number>(-92.134);
  const [triageNivel, setTriageNivel] = useState<NivelTriage>("rojo");
  const [fc, setFc] = useState<number>(118);
  const [fr, setFr] = useState<number>(24);
  const [taSis, setTaSis] = useState<number>(92);
  const [taDia, setTaDia] = useState<number>(58);
  const [spo2, setSpo2] = useState<number>(91);
  const [notas, setNotas] = useState<string>("Captura sintética desde ambulancia en ruta.");

  // Opciones avanzadas de despacho
  const [preferredHosp, setPreferredHosp] = useState<string>("");
  const [strictPreferred, setStrictPreferred] = useState<boolean>(false);

  // Perfil 1: Politrauma
  const [mecanismo, setMecanismo] = useState<string>("colision_vehicular");
  const [lesionRegion, setLesionRegion] = useState<string>("torax");
  const [lesionTipo, setLesionTipo] = useState<string>("neumotorax a tension");
  const [lesionAis, setLesionAis] = useState<number>(4);
  const [hemorragia, setHemorragia] = useState<boolean>(true);
  const [quirofanoSosp, setQuirofanoSosp] = useState<boolean>(true);
  const [issEstimado, setIssEstimado] = useState<number>(25);

  // Perfil 2: Infarto agudo
  const [elevacionSt, setElevacionSt] = useState<boolean>(true);
  const [derivaciones, setDerivaciones] = useState<string[]>(["V1", "V2", "V3", "V4"]);
  const [ritmo, setRitmo] = useState<string>("sinusal");
  const [killip, setKillip] = useState<number>(2);
  const [inicioDolorMin, setInicioDolorMin] = useState<number>(60);
  const [troponinaPos, setTroponinaPos] = useState<boolean>(true);

  // Perfil 3: TCE
  const [gOcular, setGOcular] = useState<number>(2);
  const [gVerbal, setGVerbal] = useState<number>(2);
  const [gMotor, setGMotor] = useState<number>(4);
  const [pupilaIzq, setPupilaIzq] = useState<number>(5.0);
  const [pupilaDer, setPupilaDer] = useState<number>(3.0);
  const [pupilasReact, setPupilasReact] = useState<boolean>(false);
  const [herniacion, setHerniacion] = useState<boolean>(true);
  const [viaAereaAseg, setViaAereaAseg] = useState<boolean>(true);

  // Perfil 4: Intoxicación / Quemaduras
  const [subtipoIQ, setSubtipoIQ] = useState<"quemadura" | "intoxicacion" | "mixto">("quemadura");
  const [agente, setAgente] = useState<string>("organofosforado");
  const [viaExp, setViaExp] = useState<string>("inhalada");
  const [sctPct, setSctPct] = useState<number>(32.5);
  const [gradoQuem, setGradoQuem] = useState<"1" | "2" | "3">("2");
  const [lesionInhal, setLesionInhal] = useState<boolean>(true);
  const [viaComprometida, setViaComprometida] = useState<boolean>(true);

  // Estado de respuesta
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DispatchEvaluateResponse | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const glasgowTotal = gOcular + gVerbal + gMotor;

  function applyPreset(preset: TipoIncidente) {
    setTipoIncidente(preset);
    setSynId(generateSynId());
    setResult(null);
    setErrorMsg(null);
    setHttpStatus(null);
    if (preset === "trauma_craneoencefalico") {
      setMunicipio("Comitán de Domínguez");
      setOrigenZona("comitan");
      setLat(16.251);
      setLon(-92.134);
      setTriageNivel("rojo");
    } else if (preset === "infarto_agudo") {
      setMunicipio("Tuxtla Gutiérrez");
      setOrigenZona("tuxtla");
      setLat(16.753);
      setLon(-93.115);
      setTriageNivel("rojo");
    } else if (preset === "politrauma") {
      setMunicipio("San Cristóbal de Las Casas");
      setOrigenZona("san_cristobal");
      setLat(16.737);
      setLon(-92.638);
      setTriageNivel("rojo");
    } else {
      setMunicipio("San Cristóbal de Las Casas");
      setOrigenZona("san_cristobal");
      setLat(16.735);
      setLon(-92.641);
      setTriageNivel("rojo");
      setSubtipoIQ("quemadura");
    }
  }

  function buildPerfil(): Record<string, unknown> {
    if (tipoIncidente === "politrauma") {
      return {
        tipo: "politrauma",
        mecanismo_lesion: mecanismo,
        lesiones: [{ region: lesionRegion, tipo_lesion: lesionTipo, ais: Number(lesionAis) }],
        hemorragia_activa: hemorragia,
        requiere_quirofano_sospechado: quirofanoSosp,
        iss_estimado: Number(issEstimado),
      };
    }
    if (tipoIncidente === "infarto_agudo") {
      return {
        tipo: "infarto_agudo",
        ecg: {
          elevacion_st: elevacionSt,
          derivaciones_afectadas: derivaciones,
          ritmo,
        },
        killip: Number(killip),
        inicio_dolor_min: Number(inicioDolorMin),
        troponina_rapida_positiva: troponinaPos,
      };
    }
    if (tipoIncidente === "trauma_craneoencefalico") {
      return {
        tipo: "trauma_craneoencefalico",
        glasgow: {
          ocular: Number(gOcular),
          verbal: Number(gVerbal),
          motor: Number(gMotor),
          total: glasgowTotal,
        },
        pupilas: {
          izquierda_mm: Number(pupilaIzq),
          derecha_mm: Number(pupilaDer),
          reactivas: pupilasReact,
        },
        signos_herniacion: herniacion,
        via_aerea_asegurada: viaAereaAseg,
      };
    }
    const iq: Record<string, unknown> = {
      tipo: "intoxicacion_quemaduras",
      subtipo: subtipoIQ,
      via_aerea_comprometida: viaComprometida,
    };
    if (subtipoIQ === "intoxicacion" || subtipoIQ === "mixto") {
      iq.agente = agente;
      iq.via_exposicion = viaExp;
    }
    if (subtipoIQ === "quemadura" || subtipoIQ === "mixto") {
      iq.sct_quemada_pct = Number(sctPct);
      iq.grado_quemadura = gradoQuem;
      iq.lesion_inhalatoria = lesionInhal;
    }
    return iq;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErrorMsg(null);
    setResult(null);
    setHttpStatus(null);

    if (!/^SYN-[0-9A-Z]{6,12}$/.test(synId)) {
      setErrorMsg("El ID sintético debe cumplir el patrón SYN- seguido de 6 a 12 caracteres alfanuméricos (ej. SYN-700101).");
      return;
    }
    if (tipoIncidente === "intoxicacion_quemaduras" && (subtipoIQ === "intoxicacion" || subtipoIQ === "mixto") && !agente.trim()) {
      setErrorMsg("Para subtipo intoxicación o mixto debe especificar el agente.");
      return;
    }

    const nowIso = new Date().toISOString();
    const requestBody: Record<string, unknown> = {
      frap: {
        schema_version: "1.0",
        tipo_incidente: tipoIncidente,
        paciente_sintetico: {
          id_sintetico: synId,
          sexo,
          grupo_edad: grupoEdad,
        },
        ubicacion_escena: {
          municipio,
          latitud: Number(lat),
          longitud: Number(lon),
          referencia: "Captura desde aplicación web TraumaNet",
        },
        triage: {
          nivel: triageNivel,
          evaluado_en: nowIso,
          observaciones: "Evaluación prehospitalaria sintética",
        },
        protocolo_codigo: PROTOCOLO_POR_TIPO[tipoIncidente],
        signos_vitales: [
          {
            medido_en: nowIso,
            fc: Number(fc),
            fr: Number(fr),
            ta_sistolica: Number(taSis),
            ta_diastolica: Number(taDia),
            spo2: Number(spo2),
          },
        ],
        notas,
        perfil: buildPerfil(),
      },
      origen_zona: origenZona,
    };
    if (preferredHosp) {
      requestBody.preferred_hospital_id = Number(preferredHosp);
      requestBody.strict_preferred_hospital = strictPreferred;
    }

    setSubmitting(true);
    try {
      const res = await api.evaluateAndAssign(token, requestBody);
      setHttpStatus(201);
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setHttpStatus(err.status);
        // 409 y 503 de fallo parcial devuelven un DispatchEvaluateResponse estructurado
        if (err.body && typeof err.body === "object" && "estado_despacho" in err.body) {
          setResult(err.body as DispatchEvaluateResponse);
        }
        setErrorMsg(`HTTP ${err.status}: ${err.message}`);
      } else {
        setErrorMsg("Error inesperado enviando el FRAP.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell allowedRoles={["PARAMEDICO", "CRUM"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Captura Prehospitalaria (FRAP Dinámico — Decisión 1)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Guarda el FRAP en MongoDB, evalúa red/protocolo en Neo4j y ejecuta reserva atómica ACID en PostgreSQL.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["trauma_craneoencefalico", "Preset TCE (Comitán)"],
                ["infarto_agudo", "Preset IAM (Tuxtla)"],
                ["politrauma", "Preset Politrauma (SCLC)"],
                ["intoxicacion_quemaduras", "Preset Quemadura"],
              ] as Array<[TipoIncidente, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  tipoIncidente === key
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Formulario dinámico */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-6"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Ambulance className="h-5 w-5 text-cyan-600" />
                Hoja FRAP ({PROTOCOLO_POR_TIPO[tipoIncidente]})
              </div>
              <TriageBadge nivel={triageNivel} />
            </div>

            {/* Núcleo común */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Perfil clínico (cambia esquema MongoDB)
                </label>
                <select
                  value={tipoIncidente}
                  onChange={(e) => setTipoIncidente(e.target.value as TipoIncidente)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="politrauma">Politrauma (PT-POLITRAUMA)</option>
                  <option value="infarto_agudo">Infarto Agudo (PT-IAM)</option>
                  <option value="trauma_craneoencefalico">Trauma Craneoencefálico (PT-TCE)</option>
                  <option value="intoxicacion_quemaduras">Intoxicación / Quemaduras (PT-INTOX-QUEM)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ID Paciente Sintético (sin PHI)
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={synId}
                    onChange={(e) => setSynId(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => setSynId(generateSynId())}
                    className="rounded-lg border border-slate-300 px-2.5 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Nuevo
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Triage</label>
                <select
                  value={triageNivel}
                  onChange={(e) => setTriageNivel(e.target.value as NivelTriage)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="rojo">Rojo (Crítico)</option>
                  <option value="amarillo">Amarillo (Urgente)</option>
                  <option value="verde">Verde (Diferible)</option>
                  <option value="negro">Negro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value as "F" | "M" | "indeterminado")}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="indeterminado">Indeterminado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Grupo de edad</label>
                <select
                  value={grupoEdad}
                  onChange={(e) => setGrupoEdad(e.target.value as "pediatrico" | "adulto" | "adulto_mayor")}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="pediatrico">Pediátrico</option>
                  <option value="adulto">Adulto</option>
                  <option value="adulto_mayor">Adulto mayor</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Municipio de la escena
                </label>
                <input
                  type="text"
                  required
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Zona origen (corredor)
                </label>
                <select
                  value={origenZona}
                  onChange={(e) => setOrigenZona(e.target.value as ZonaCorredor)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="tuxtla">Tuxtla Gutiérrez</option>
                  <option value="san_cristobal">San Cristóbal de Las Casas</option>
                  <option value="comitan">Comitán de Domínguez</option>
                </select>
              </div>
            </div>

            {/* Signos vitales */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Signos Vitales</div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[
                  ["FC", fc, setFc],
                  ["FR", fr, setFr],
                  ["TA Sis", taSis, setTaSis],
                  ["TA Dia", taDia, setTaDia],
                  ["SpO2 %", spo2, setSpo2],
                ].map(([lbl, val, setter]) => (
                  <div key={lbl as string}>
                    <label className="block text-[11px] font-medium text-slate-500">{lbl as string}</label>
                    <input
                      type="number"
                      required
                      value={val as number}
                      onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Subdocumento dinámico según perfil */}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/20">
              <div className="text-xs font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                Subdocumento Clínico Específico: {tipoIncidente}
              </div>

              {tipoIncidente === "politrauma" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium">Mecanismo de lesión</label>
                    <select
                      value={mecanismo}
                      onChange={(e) => setMecanismo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="colision_vehicular">Colisión vehicular</option>
                      <option value="atropellamiento">Atropellamiento</option>
                      <option value="caida_altura">Caída de altura</option>
                      <option value="arma_blanca">Arma blanca</option>
                      <option value="arma_fuego">Arma de fuego</option>
                      <option value="aplastamiento">Aplastamiento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium">Región lesión principal</label>
                    <select
                      value={lesionRegion}
                      onChange={(e) => setLesionRegion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="torax">Tórax</option>
                      <option value="abdomen">Abdomen</option>
                      <option value="pelvis">Pelvis</option>
                      <option value="cabeza">Cabeza</option>
                      <option value="columna">Columna</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium">Descripción lesión</label>
                    <input
                      type="text"
                      value={lesionTipo}
                      onChange={(e) => setLesionTipo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium">AIS (1–6)</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={lesionAis}
                        onChange={(e) => setLesionAis(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">ISS (0–75)</label>
                      <input
                        type="number"
                        min={0}
                        max={75}
                        value={issEstimado}
                        onChange={(e) => setIssEstimado(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={hemorragia} onChange={(e) => setHemorragia(e.target.checked)} />
                    Hemorragia activa
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={quirofanoSosp} onChange={(e) => setQuirofanoSosp(e.target.checked)} />
                    Sospecha de quirófano inmediato
                  </label>
                </div>
              )}

              {tipoIncidente === "infarto_agudo" && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium">Killip (1–4)</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={killip}
                        onChange={(e) => setKillip(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Inicio dolor (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={inicioDolorMin}
                        onChange={(e) => setInicioDolorMin(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Ritmo ECG</label>
                      <select
                        value={ritmo}
                        onChange={(e) => setRitmo(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="sinusal">Sinusal</option>
                        <option value="fibrilacion_auricular">Fibrilación auricular</option>
                        <option value="taquicardia_ventricular">Taquicardia ventricular</option>
                        <option value="bloqueo_av">Bloqueo AV</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium">Derivaciones afectadas</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {DERIVACIONES_ECG.map((d) => {
                        const active = derivaciones.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setDerivaciones((prev) =>
                                prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                              )
                            }
                            className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                              active
                                ? "bg-cyan-600 text-white"
                                : "border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={elevacionSt} onChange={(e) => setElevacionSt(e.target.checked)} />
                      Elevación ST
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={troponinaPos} onChange={(e) => setTroponinaPos(e.target.checked)} />
                      Troponina rápida positiva
                    </label>
                  </div>
                </div>
              )}

              {tipoIncidente === "trauma_craneoencefalico" && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium">Ocular (1–4)</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={gOcular}
                        onChange={(e) => setGOcular(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Verbal (1–5)</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={gVerbal}
                        onChange={(e) => setGVerbal(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Motor (1–6)</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={gMotor}
                        onChange={(e) => setGMotor(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div className="rounded-lg border border-cyan-300 bg-white p-1.5 text-center dark:border-cyan-800 dark:bg-slate-950">
                      <div className="text-[10px] font-semibold uppercase text-slate-500">Glasgow</div>
                      <div className="font-mono text-base font-bold text-cyan-700 dark:text-cyan-400">
                        {glasgowTotal}/15
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium">Pupila Izq (mm)</label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        max={9}
                        value={pupilaIzq}
                        onChange={(e) => setPupilaIzq(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Pupila Der (mm)</label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        max={9}
                        value={pupilaDer}
                        onChange={(e) => setPupilaDer(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={pupilasReact} onChange={(e) => setPupilasReact(e.target.checked)} />
                      Pupilas reactivas
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={herniacion} onChange={(e) => setHerniacion(e.target.checked)} />
                      Signos de herniación
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={viaAereaAseg} onChange={(e) => setViaAereaAseg(e.target.checked)} />
                      Vía aérea asegurada
                    </label>
                  </div>
                </div>
              )}

              {tipoIncidente === "intoxicacion_quemaduras" && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium">Subtipo</label>
                      <select
                        value={subtipoIQ}
                        onChange={(e) => setSubtipoIQ(e.target.value as "quemadura" | "intoxicacion" | "mixto")}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="quemadura">Quemadura</option>
                        <option value="intoxicacion">Intoxicación</option>
                        <option value="mixto">Mixto</option>
                      </select>
                    </div>
                    {(subtipoIQ === "intoxicacion" || subtipoIQ === "mixto") && (
                      <>
                        <div>
                          <label className="block text-xs font-medium">Agente tóxico</label>
                          <input
                            type="text"
                            value={agente}
                            onChange={(e) => setAgente(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Vía de exposición</label>
                          <select
                            value={viaExp}
                            onChange={(e) => setViaExp(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="inhalada">Inhalada</option>
                            <option value="oral">Oral</option>
                            <option value="dermica">Dérmica</option>
                            <option value="parenteral">Parenteral</option>
                          </select>
                        </div>
                      </>
                    )}
                    {(subtipoIQ === "quemadura" || subtipoIQ === "mixto") && (
                      <>
                        <div>
                          <label className="block text-xs font-medium">% SCT Quemada</label>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={100}
                            value={sctPct}
                            onChange={(e) => setSctPct(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium">Grado</label>
                          <select
                            value={gradoQuem}
                            onChange={(e) => setGradoQuem(e.target.value as "1" | "2" | "3")}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="1">1.er grado</option>
                            <option value="2">2.º grado</option>
                            <option value="3">3.er grado</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={viaComprometida} onChange={(e) => setViaComprometida(e.target.checked)} />
                      Vía aérea comprometida
                    </label>
                    {(subtipoIQ === "quemadura" || subtipoIQ === "mixto") && (
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={lesionInhal} onChange={(e) => setLesionInhal(e.target.checked)} />
                        Lesión inhalatoria
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Opcional: preferencia de hospital */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Hospital preferido (opcional)
                </label>
                <select
                  value={preferredHosp}
                  onChange={(e) => setPreferredHosp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Automático por mejor ETA + compatibilidad</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                    <option key={id} value={id}>
                      Priorizar HOSP-0{id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    disabled={!preferredHosp}
                    checked={strictPreferred}
                    onChange={(e) => setStrictPreferred(e.target.checked)}
                  />
                  Estricto (no derivar si está lleno → 409)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Notas clínicas</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-cyan-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Evaluando en MongoDB + Neo4j + PostgreSQL..." : "Enviar FRAP y Evaluar Destino"}
            </button>
          </form>

          {/* Tarjeta de resultado unificado (Decisión 1) */}
          <div className="space-y-4 lg:col-span-6">
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {httpStatus === 409
                      ? "Sin disponibilidad — FRAP registrado en sin_asignacion (HTTP 409)"
                      : httpStatus === 503
                      ? "Fallo parcial de persistencia — Política sin_asignacion activa (HTTP 503)"
                      : "Error de validación / envío"}
                  </div>
                  <div className="mt-1">{errorMsg}</div>
                </div>
              </div>
            )}

            {!result ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <Ambulance className="h-10 w-10 text-slate-400" />
                <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Resultado unificado de la Decisión 1
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Al enviar el FRAP verás aquí el hospital asignado, la reserva atómica con TTL de 15 min, la
                  incertidumbre de ruta, la frescura del inventario (<code className="font-mono">data_vintage</code>),
                  las alternativas rankeadas y los motivos de descarte de cada hospital.
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {result.estado_despacho === "asignado" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Estado: {result.estado_despacho.toUpperCase()}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <DataVintageBadge iso={result.data_vintage} />
                    <Link
                      href={`/expedientes/${result.frap_id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Ver expediente <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{result.mensaje}</p>

                {result.alerta_concurrencia && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Alerta de concurrencia detectada durante el bloqueo de fila (SELECT ... FOR UPDATE).
                  </div>
                )}

                {/* Hospital asignado y reserva */}
                {result.hospital_asignado && result.reserva && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          Hospital Destino Propuesto · Nivel {result.hospital_asignado.nivel_atencion}
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          HOSP-0{result.hospital_asignado.hospital_id} — {result.hospital_asignado.nombre}
                        </div>
                      </div>
                      <EstadoViaBadge estado={result.hospital_asignado.estado_via} />
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-900/70">
                        <div className="text-[10px] font-semibold uppercase text-slate-500">Reserva Atómica ACID</div>
                        <div className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white">
                          {result.reserva.tipo_recurso} ({result.hospital_asignado.recurso_disponible_antes} →{" "}
                          {result.hospital_asignado.recurso_disponible_despues} disp.)
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          TTL {result.reserva.ttl_minutos} min · Expira: {formatDateTime(result.reserva.expira_en)}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-900/70">
                        <div className="text-[10px] font-semibold uppercase text-slate-500">Incertidumbre de Ruta</div>
                        <div className="mt-0.5 font-mono font-bold text-slate-900 dark:text-white">
                          ETA {result.incertidumbre_ruta.eta_base_min} min (±{result.incertidumbre_ruta.margen_min} min)
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-slate-500">
                          Rango: {result.incertidumbre_ruta.eta_minimo_min}–{result.incertidumbre_ruta.eta_maximo_min} min ·{" "}
                          {result.hospital_asignado.tramo_id}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alternativas rankeadas */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Alternativas Rankeadas ({result.alternativas_rankeadas.length})
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {result.alternativas_rankeadas.map((alt) => (
                      <div
                        key={alt.hospital_id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                      >
                        <div>
                          <strong className="text-slate-900 dark:text-white">
                            HOSP-0{alt.hospital_id} · {alt.nombre}
                          </strong>
                          <div className="font-mono text-[11px] text-slate-500">
                            ETA {alt.eta_min} ± {alt.eta_margen_min} min · {alt.recurso_disponibles} disp. · Guardia:{" "}
                            {alt.guardia_especialista_presente ? "Sí" : "Ausente"}
                          </div>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            alt.compatible_operativo
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {alt.compatible_operativo ? "Viable" : "Descartado op."}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hospitales descartados */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Justificación de Hospitales Descartados ({result.hospitales_descartados.length})
                  </h3>
                  <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {result.hospitales_descartados.map((desc) => (
                      <div
                        key={desc.hospital_id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          HOSP-0{desc.hospital_id} · {desc.nombre} ({desc.zona})
                        </div>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-red-700 dark:text-red-300">
                          {desc.motivos_descarte.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-100 p-2.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <strong>Supuestos de ruta:</strong> {result.incertidumbre_ruta.supuestos}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
