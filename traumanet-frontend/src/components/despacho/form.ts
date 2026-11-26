/**
 * Estado del asistente de captura del FRAP y validación en cliente que refleja
 * los schemas Pydantic del backend (app/schemas/frap.py y dispatch.py).
 */
import { PROTOCOLO_POR_INCIDENTE } from "@/lib/labels";
import type {
  Derivacion,
  DispatchEvaluateRequest,
  FRAPCreate,
  MecanismoLesion,
  NivelTriage,
  PacienteSintetico,
  PerfilClinico,
  RegionLesion,
  RitmoEcg,
  TipoIncidente,
  ViaMedicamento,
} from "@/types/api";

export type SiNo = boolean | null;

export interface Medicion {
  medido_en: string;
  fc: string;
  fr: string;
  ta_sistolica: string;
  ta_diastolica: string;
  spo2: string;
  temperatura_c: string;
  glucosa_mgdl: string;
}

export interface Lesion {
  region: RegionLesion | "";
  tipo_lesion: string;
  ais: string;
}

export interface Medicamento {
  nombre: string;
  dosis: string;
  via: ViaMedicamento | "";
  aplicado_en: string;
}

export interface FormState {
  id_sintetico: string;
  sexo: PacienteSintetico["sexo"] | null;
  grupo_edad: PacienteSintetico["grupo_edad"] | null;
  triage: NivelTriage | null;
  municipio: string;
  latitud: string;
  longitud: string;
  referencia: string;
  mediciones: Medicion[];
  tipo: TipoIncidente | null;
  pt: {
    mecanismo: MecanismoLesion | "";
    lesiones: Lesion[];
    hemorragia: SiNo;
    torniquete: SiNo;
    quirofano: SiNo;
    iss: string;
  };
  iam: {
    elevacion_st: SiNo;
    derivaciones: Derivacion[];
    ritmo: RitmoEcg | "";
    killip: number | null;
    inicio_dolor_min: string;
    trombolisis: SiNo;
    troponina: SiNo;
  };
  tce: {
    ocular: string;
    verbal: string;
    motor: string;
    izquierda_mm: string;
    derecha_mm: string;
    reactivas: SiNo;
    herniacion: SiNo;
    via_aerea: SiNo;
    anticoagulado: SiNo;
    convulsiones: SiNo;
  };
  iq: {
    subtipo: "intoxicacion" | "quemadura" | "mixto" | null;
    agente: string;
    via_exposicion: "" | "oral" | "inhalada" | "dermica" | "parenteral" | "ocular";
    sct: string;
    grado: "" | "1" | "2" | "3";
    lesion_inhalatoria: SiNo;
    via_aerea_comprometida: SiNo;
    descontaminacion: SiNo;
    antidoto: string;
  };
  ambulancia_id: string;
  medicamentos: Medicamento[];
  notas: string;
  /* Opciones del regulador (solo CRUM) */
  preferred_hospital_id: string;
  strict_preferred_hospital: boolean;
  ttl_minutos: string;
}

export function nuevaMedicion(): Medicion {
  return {
    medido_en: new Date().toISOString(),
    fc: "",
    fr: "",
    ta_sistolica: "",
    ta_diastolica: "",
    spo2: "",
    temperatura_c: "",
    glucosa_mgdl: "",
  };
}

export function initialForm(): FormState {
  return {
    id_sintetico: "",
    sexo: null,
    grupo_edad: null,
    triage: null,
    municipio: "",
    latitud: "",
    longitud: "",
    referencia: "",
    mediciones: [nuevaMedicion()],
    tipo: null,
    pt: { mecanismo: "", lesiones: [{ region: "", tipo_lesion: "", ais: "" }], hemorragia: null, torniquete: null, quirofano: null, iss: "" },
    iam: { elevacion_st: null, derivaciones: [], ritmo: "", killip: null, inicio_dolor_min: "", trombolisis: null, troponina: null },
    tce: { ocular: "", verbal: "", motor: "", izquierda_mm: "", derecha_mm: "", reactivas: null, herniacion: null, via_aerea: null, anticoagulado: null, convulsiones: null },
    iq: { subtipo: null, agente: "", via_exposicion: "", sct: "", grado: "", lesion_inhalatoria: null, via_aerea_comprometida: null, descontaminacion: null, antidoto: "" },
    ambulancia_id: "",
    medicamentos: [],
    notas: "",
    preferred_hospital_id: "",
    strict_preferred_hospital: false,
    ttl_minutos: "15",
  };
}

/* ---------- Validadores ---------- */
export type Errors = Record<string, string>;

const ID_RE = /^SYN-[0-9A-Z]{6,12}$/;

export function parseNum(v: string): number | null {
  const t = v.trim().replace(",", ".").replace("−", "-");
  if (t === "" || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function int(errors: Errors, key: string, v: string, min: number, max: number, required = true) {
  if (v.trim() === "") {
    if (required) errors[key] = "Obligatorio";
    return;
  }
  const n = parseNum(v);
  if (n === null || !Number.isInteger(n)) errors[key] = "Debe ser un número entero";
  else if (n < min || n > max) errors[key] = `Valor fuera de rango: debe ser de ${min} a ${max}`;
}

function num(errors: Errors, key: string, v: string, min: number, max: number, required = true) {
  if (v.trim() === "") {
    if (required) errors[key] = "Obligatorio";
    return;
  }
  const n = parseNum(v);
  if (n === null) errors[key] = "Debe ser un número";
  else if (n < min || n > max) errors[key] = `Valor fuera de rango: debe ser de ${min} a ${max}`;
}

function req<T>(errors: Errors, key: string, v: T | null | "" | undefined, msg = "Selecciona una opción") {
  if (v === null || v === "" || v === undefined) errors[key] = msg;
}

function maxLen(errors: Errors, key: string, v: string, max: number) {
  if (v.length > max) errors[key] = `Máximo ${max} caracteres`;
}

export function validarPaso(paso: number, f: FormState, esCrum: boolean): Errors {
  const e: Errors = {};
  if (paso === 1) {
    if (!ID_RE.test(f.id_sintetico)) e.id_sintetico = "Formato: SYN- seguido de 6 a 12 caracteres (A–Z, 0–9)";
    req(e, "sexo", f.sexo);
    req(e, "grupo_edad", f.grupo_edad);
    req(e, "triage", f.triage);
    const m = f.municipio.trim();
    if (m.length < 2) e.municipio = "Mínimo 2 caracteres";
    maxLen(e, "municipio", m, 80);
    num(e, "latitud", f.latitud, -90, 90);
    num(e, "longitud", f.longitud, -180, 180);
    maxLen(e, "referencia", f.referencia, 200);
  }
  if (paso === 2) {
    f.mediciones.forEach((m, i) => {
      int(e, `sv${i}.fc`, m.fc, 0, 300);
      int(e, `sv${i}.fr`, m.fr, 0, 80);
      int(e, `sv${i}.ta_sistolica`, m.ta_sistolica, 0, 350);
      int(e, `sv${i}.ta_diastolica`, m.ta_diastolica, 0, 250);
      int(e, `sv${i}.spo2`, m.spo2, 0, 100);
      num(e, `sv${i}.temperatura_c`, m.temperatura_c, 20, 45, false);
      int(e, `sv${i}.glucosa_mgdl`, m.glucosa_mgdl, 0, 1500, false);
    });
  }
  if (paso === 3) req(e, "tipo", f.tipo, "Selecciona el tipo de incidente");
  if (paso === 4) {
    switch (f.tipo) {
      case "politrauma":
        req(e, "pt.mecanismo", f.pt.mecanismo);
        if (f.pt.lesiones.length === 0) e["pt.lesiones"] = "Registra al menos una lesión";
        f.pt.lesiones.forEach((l, i) => {
          req(e, `pt.l${i}.region`, l.region);
          if (!l.tipo_lesion.trim()) e[`pt.l${i}.tipo_lesion`] = "Obligatorio";
          maxLen(e, `pt.l${i}.tipo_lesion`, l.tipo_lesion, 80);
          int(e, `pt.l${i}.ais`, l.ais, 1, 6);
        });
        req(e, "pt.hemorragia", f.pt.hemorragia);
        int(e, "pt.iss", f.pt.iss, 0, 75, false);
        break;
      case "infarto_agudo":
        req(e, "iam.elevacion_st", f.iam.elevacion_st);
        req(e, "iam.killip", f.iam.killip);
        int(e, "iam.inicio_dolor_min", f.iam.inicio_dolor_min, 0, 4320);
        break;
      case "trauma_craneoencefalico":
        int(e, "tce.ocular", f.tce.ocular, 1, 4);
        int(e, "tce.verbal", f.tce.verbal, 1, 5);
        int(e, "tce.motor", f.tce.motor, 1, 6);
        num(e, "tce.izquierda_mm", f.tce.izquierda_mm, 1, 9);
        num(e, "tce.derecha_mm", f.tce.derecha_mm, 1, 9);
        req(e, "tce.reactivas", f.tce.reactivas);
        break;
      case "intoxicacion_quemaduras": {
        const s = f.iq.subtipo;
        req(e, "iq.subtipo", s);
        if ((s === "intoxicacion" || s === "mixto") && !f.iq.agente.trim())
          e["iq.agente"] = "Obligatorio para intoxicación o mixto";
        maxLen(e, "iq.agente", f.iq.agente, 100);
        num(e, "iq.sct", f.iq.sct, 0, 100, s === "quemadura" || s === "mixto");
        if ((s === "quemadura" || s === "mixto") && f.iq.sct.trim() === "")
          e["iq.sct"] = "Obligatorio para quemadura o mixto";
        req(e, "iq.via_aerea_comprometida", f.iq.via_aerea_comprometida);
        maxLen(e, "iq.antidoto", f.iq.antidoto, 80);
        break;
      }
      default:
        e.tipo = "Selecciona el tipo de incidente en el paso 3";
    }
  }
  if (paso === 5) {
    int(e, "ambulancia_id", f.ambulancia_id, 1, Number.MAX_SAFE_INTEGER, false);
    if (e.ambulancia_id?.startsWith("Valor")) e.ambulancia_id = "Número entero ≥ 1";
    maxLen(e, "notas", f.notas, 2000);
    f.medicamentos.forEach((m, i) => {
      if (!m.nombre.trim()) e[`med${i}.nombre`] = "Obligatorio";
      maxLen(e, `med${i}.nombre`, m.nombre, 80);
      if (!m.dosis.trim()) e[`med${i}.dosis`] = "Obligatorio";
      maxLen(e, `med${i}.dosis`, m.dosis, 40);
      req(e, `med${i}.via`, m.via);
    });
    if (esCrum) int(e, "ttl_minutos", f.ttl_minutos, 1, 120);
  }
  return e;
}

export function glasgowTotal(f: FormState): number | null {
  const o = parseNum(f.tce.ocular);
  const v = parseNum(f.tce.verbal);
  const m = parseNum(f.tce.motor);
  if (o === null || v === null || m === null) return null;
  return o + v + m;
}

/* ---------- Construcción del payload ---------- */
function opt<T>(v: T | null | "" | undefined): T | undefined {
  return v === null || v === "" ? undefined : (v as T);
}
function optNum(v: string): number | undefined {
  const n = parseNum(v);
  return n === null ? undefined : n;
}

function perfil(f: FormState): PerfilClinico {
  switch (f.tipo) {
    case "politrauma":
      return {
        tipo: "politrauma",
        mecanismo_lesion: f.pt.mecanismo as MecanismoLesion,
        lesiones: f.pt.lesiones.map((l) => ({
          region: l.region as RegionLesion,
          tipo_lesion: l.tipo_lesion.trim(),
          ais: Number(l.ais),
        })),
        hemorragia_activa: f.pt.hemorragia as boolean,
        torniquete_aplicado: opt(f.pt.torniquete),
        requiere_quirofano_sospechado: opt(f.pt.quirofano),
        iss_estimado: optNum(f.pt.iss),
      };
    case "infarto_agudo":
      return {
        tipo: "infarto_agudo",
        ecg: {
          elevacion_st: f.iam.elevacion_st as boolean,
          derivaciones_afectadas: f.iam.derivaciones,
          ritmo: opt(f.iam.ritmo),
        },
        killip: f.iam.killip as number,
        inicio_dolor_min: Number(f.iam.inicio_dolor_min),
        trombolisis_aplicada: opt(f.iam.trombolisis),
        troponina_rapida_positiva: opt(f.iam.troponina),
      };
    case "trauma_craneoencefalico":
      return {
        tipo: "trauma_craneoencefalico",
        glasgow: {
          ocular: Number(f.tce.ocular),
          verbal: Number(f.tce.verbal),
          motor: Number(f.tce.motor),
          total: glasgowTotal(f) as number,
        },
        pupilas: {
          izquierda_mm: parseNum(f.tce.izquierda_mm) as number,
          derecha_mm: parseNum(f.tce.derecha_mm) as number,
          reactivas: f.tce.reactivas as boolean,
        },
        signos_herniacion: opt(f.tce.herniacion),
        via_aerea_asegurada: opt(f.tce.via_aerea),
        anticoagulado: opt(f.tce.anticoagulado),
        convulsiones: opt(f.tce.convulsiones),
      };
    case "intoxicacion_quemaduras":
    default:
      return {
        tipo: "intoxicacion_quemaduras",
        subtipo: f.iq.subtipo ?? "intoxicacion",
        agente: opt(f.iq.agente.trim()),
        via_exposicion: opt(f.iq.via_exposicion),
        sct_quemada_pct: optNum(f.iq.sct),
        grado_quemadura: opt(f.iq.grado),
        lesion_inhalatoria: opt(f.iq.lesion_inhalatoria),
        via_aerea_comprometida: f.iq.via_aerea_comprometida as boolean,
        descontaminacion_realizada: opt(f.iq.descontaminacion),
        antidoto_aplicado: opt(f.iq.antidoto.trim()),
      };
  }
}

/** Elimina claves undefined (el backend usa extra="forbid" pero acepta omitidos). */
function clean<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

export function buildRequest(f: FormState, esCrum: boolean): DispatchEvaluateRequest {
  const tipo = f.tipo as TipoIncidente;
  const frap: FRAPCreate = {
    schema_version: "1.0",
    tipo_incidente: tipo,
    protocolo_codigo: PROTOCOLO_POR_INCIDENTE[tipo],
    paciente_sintetico: {
      id_sintetico: f.id_sintetico,
      sexo: f.sexo as PacienteSintetico["sexo"],
      grupo_edad: f.grupo_edad as PacienteSintetico["grupo_edad"],
    },
    ubicacion_escena: {
      municipio: f.municipio.trim(),
      latitud: parseNum(f.latitud) as number,
      longitud: parseNum(f.longitud) as number,
      referencia: opt(f.referencia.trim()),
    },
    triage: { nivel: f.triage as NivelTriage, evaluado_en: new Date().toISOString() },
    signos_vitales: f.mediciones.map((m) => ({
      medido_en: m.medido_en,
      fc: Number(m.fc),
      fr: Number(m.fr),
      ta_sistolica: Number(m.ta_sistolica),
      ta_diastolica: Number(m.ta_diastolica),
      spo2: Number(m.spo2),
      temperatura_c: optNum(m.temperatura_c),
      glucosa_mgdl: optNum(m.glucosa_mgdl),
    })),
    ambulancia_id: optNum(f.ambulancia_id),
    medicamentos_aplicados: f.medicamentos.length
      ? f.medicamentos.map((m) => ({
          nombre: m.nombre.trim(),
          dosis: m.dosis.trim(),
          via: m.via as ViaMedicamento,
          aplicado_en: m.aplicado_en,
        }))
      : undefined,
    notas: opt(f.notas.trim()),
    perfil: perfil(f),
  };

  const body: DispatchEvaluateRequest = { frap, strict_preferred_hospital: false };
  if (esCrum) {
    const pref = optNum(f.preferred_hospital_id);
    if (pref) {
      body.preferred_hospital_id = pref;
      body.strict_preferred_hospital = f.strict_preferred_hospital;
    }
    body.ttl_minutos = optNum(f.ttl_minutos) ?? 15;
  }
  return clean(body);
}
