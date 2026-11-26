/** Catálogos y etiquetas en español (datos de apoyo del contrato). */
import type {
  EstadoFrap,
  EstadoVia,
  MecanismoLesion,
  NivelTriage,
  ProtocoloCodigo,
  RegionLesion,
  Rol,
  TipoIncidente,
  TipoRecurso,
  ZonaCorredor,
} from "@/types/api";

export const ROL_LABEL: Record<Rol, string> = {
  CRUM: "CRUM",
  PARAMEDICO: "Paramédico",
  JEFE_URGENCIAS: "Jefe de urgencias",
};

export const TIPOS_INCIDENTE: TipoIncidente[] = [
  "politrauma",
  "infarto_agudo",
  "trauma_craneoencefalico",
  "intoxicacion_quemaduras",
];

export const INCIDENTE_LABEL: Record<TipoIncidente, string> = {
  politrauma: "Politrauma",
  infarto_agudo: "Infarto agudo",
  trauma_craneoencefalico: "Trauma craneoencefálico",
  intoxicacion_quemaduras: "Intoxicación / quemaduras",
};

export const INCIDENTE_CORTO: Record<TipoIncidente, string> = {
  politrauma: "Politrauma",
  infarto_agudo: "Infarto",
  trauma_craneoencefalico: "TCE",
  intoxicacion_quemaduras: "Intox./quemaduras",
};

export const PROTOCOLO_POR_INCIDENTE: Record<TipoIncidente, ProtocoloCodigo> = {
  politrauma: "PT-POLITRAUMA",
  infarto_agudo: "PT-IAM",
  trauma_craneoencefalico: "PT-TCE",
  intoxicacion_quemaduras: "PT-INTOX-QUEM",
};

export const PROTOCOLOS: ProtocoloCodigo[] = ["PT-POLITRAUMA", "PT-IAM", "PT-TCE", "PT-INTOX-QUEM"];

export const ESTADOS_FRAP: EstadoFrap[] = [
  "reportado",
  "evaluando",
  "asignado",
  "sin_asignacion",
  "cerrado",
];

export const TIPOS_RECURSO: TipoRecurso[] = ["quirofano", "cama_uci", "sala_choque"];

export const RECURSO_LABEL: Record<TipoRecurso, string> = {
  cama_uci: "Cama UCI",
  quirofano: "Quirófano",
  sala_choque: "Sala de choque",
};

export const VIA_LABEL: Record<EstadoVia, string> = {
  normal: "Normal",
  demora: "Demora",
  bloqueo: "Bloqueo",
};

export const ESTADOS_VIA: EstadoVia[] = ["normal", "demora", "bloqueo"];

export const ZONA_LABEL: Record<ZonaCorredor, string> = {
  tuxtla: "Tuxtla",
  san_cristobal: "San Cristóbal",
  comitan: "Comitán",
};

export function zonaLabel(zona: string | null | undefined): string {
  if (!zona) return "—";
  return ZONA_LABEL[zona as ZonaCorredor] ?? zona;
}

export const TRIAGE_LABEL: Record<NivelTriage, string> = {
  rojo: "Rojo",
  amarillo: "Amarillo",
  verde: "Verde",
  negro: "Negro",
};

export const MECANISMO_LABEL: Record<MecanismoLesion, string> = {
  colision_vehicular: "Colisión vehicular",
  atropellamiento: "Atropellamiento",
  caida_altura: "Caída de altura",
  arma_blanca: "Arma blanca",
  arma_fuego: "Arma de fuego",
  aplastamiento: "Aplastamiento",
  otro: "Otro",
};

export const REGION_LABEL: Record<RegionLesion, string> = {
  cabeza: "Cabeza",
  cuello: "Cuello",
  torax: "Tórax",
  abdomen: "Abdomen",
  pelvis: "Pelvis",
  columna: "Columna",
  extremidad_sup: "Extremidad superior",
  extremidad_inf: "Extremidad inferior",
};

export const AVISO_OFICIAL =
  "TraumaNet apoya la decisión; no decide ni sustituye el criterio clínico del regulador médico del CRUM.";

export function siNo(v: boolean | null | undefined): string {
  if (v === true) return "Sí";
  if (v === false) return "No";
  return "—";
}
