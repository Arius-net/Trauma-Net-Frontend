/** Contratos TypeScript alineados con la API REST de FastAPI (sin drivers ni acceso directo a BD). */

export type UserRole = "CRUM" | "PARAMEDICO" | "JEFE_URGENCIAS";
export type TipoRecurso = "cama_uci" | "quirofano" | "sala_choque";
export type EstadoVia = "normal" | "demora" | "bloqueo";
export type ZonaCorredor = "tuxtla" | "san_cristobal" | "comitan";
export type TipoIncidente =
  | "politrauma"
  | "infarto_agudo"
  | "trauma_craneoencefalico"
  | "intoxicacion_quemaduras";
export type ProtocoloCodigo = "PT-POLITRAUMA" | "PT-IAM" | "PT-TCE" | "PT-INTOX-QUEM";
export type EstadoFrap = "reportado" | "evaluando" | "asignado" | "sin_asignacion" | "cerrado";
export type NivelTriage = "rojo" | "amarillo" | "verde" | "negro";

export interface UserProfile {
  usuario_id: number;
  nombre_usuario: string;
  rol: UserRole;
  hospital_id: number | null;
  hospital_nombre: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: UserProfile;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  engines: {
    postgresql: "up" | "down";
    mongodb: "up" | "down";
    neo4j: "up" | "down";
  };
}

export interface RecursoResumen {
  recurso_id: number;
  tipo_recurso: TipoRecurso;
  total: number;
  ocupados: number;
  reservados: number;
  disponibles: number;
  actualizado_en: string;
}

export interface ConexionResumen {
  destino_hospital_id: number;
  destino_nombre: string;
  tramo_id: string;
  distancia_km: number;
  tiempo_min: number;
  incertidumbre_min: number;
  estado_via: EstadoVia;
}

export interface HospitalRedItem {
  hospital_id: number;
  clave: string;
  nombre: string;
  municipio: string;
  zona: string;
  nivel_atencion: number;
  especialidades: string[];
  equipos_operativos: string[];
  recursos: RecursoResumen[];
  conexiones: ConexionResumen[];
}

export interface NetworkOverviewResponse {
  decision_support_notice: string;
  total_hospitales: number;
  hospitales: HospitalRedItem[];
}

export interface CascadeOption {
  hospital_id: number;
  nombre: string;
  zona: string;
  nivel_atencion: number;
  tramo_id: string;
  distancia_km: number;
  eta_min: number;
  eta_margen_min: number;
  estado_via: EstadoVia;
  tipo_recurso: TipoRecurso;
  recurso_disponibles: number;
  data_vintage: string;
  guardia_presente: boolean;
  viable: boolean;
  motivo_no_viable: string | null;
}

export interface CascadeDerivationResponse {
  decision_support_notice: string;
  hospital_saturado_id: number;
  protocolo_codigo: ProtocoloCodigo;
  recurso_critico: TipoRecurso;
  opciones_derivacion: CascadeOption[];
  data_vintage: string | null;
}

export interface TramoUpdateResponse {
  tramo_id: string;
  estado_via: EstadoVia;
  aristas_actualizadas: number;
}

export interface HospitalCapacityResponse {
  hospital_id: number;
  nombre: string;
  recursos: RecursoResumen[];
}

export interface ReservaHospitalItem {
  reserva_id: string;
  traslado_id: string;
  frap_id: string;
  recurso_id: number;
  tipo_recurso: TipoRecurso;
  cantidad: number;
  estado_reserva: string;
  estado_traslado: string;
  protocolo_codigo: string;
  eta_min: number | null;
  eta_margen_min: number | null;
  creada_en: string;
  expira_en: string;
  cerrada_en: string | null;
}

export interface ReservaActionResponse {
  reserva_id: string;
  traslado_id: string;
  estado_reserva: string;
  estado_traslado: string;
  cerrada_en: string | null;
}

export interface IncertidumbreRuta {
  eta_base_min: number | null;
  margen_min: number | null;
  eta_minimo_min: number | null;
  eta_maximo_min: number | null;
  estado_via: EstadoVia | null;
  supuestos: string;
}

export interface HospitalCandidato {
  hospital_id: number;
  nombre: string;
  zona: string;
  municipio: string;
  nivel_atencion: number;
  eta_min: number;
  eta_margen_min: number;
  estado_via: EstadoVia;
  tramo_id: string | null;
  tipo_recurso: TipoRecurso;
  recurso_disponibles: number;
  data_vintage: string;
  guardia_especialista_presente: boolean;
  compatible_grafo: boolean;
  compatible_operativo: boolean;
}

export interface HospitalDescartado {
  hospital_id: number;
  nombre: string;
  zona: string;
  motivos_descarte: string[];
}

export interface HospitalAsignado {
  hospital_id: number;
  nombre: string;
  municipio: string;
  zona: string;
  nivel_atencion: number;
  eta_min: number;
  eta_margen_min: number;
  estado_via: EstadoVia;
  tramo_id: string | null;
  recurso_disponible_antes: number;
  recurso_disponible_despues: number;
  data_vintage: string;
}

export interface ReservaConfirmada {
  reserva_id: string;
  traslado_id: string;
  recurso_id: number;
  tipo_recurso: TipoRecurso;
  cantidad: number;
  estado: string;
  creada_en: string;
  expira_en: string;
  ttl_minutos: number;
}

export interface DispatchEvaluateResponse {
  decision_support_notice: string;
  estado_despacho: "asignado" | "sin_asignacion";
  frap_id: string;
  protocolo_codigo: string;
  recurso_critico: TipoRecurso | null;
  hospital_asignado: HospitalAsignado | null;
  reserva: ReservaConfirmada | null;
  alternativas_rankeadas: HospitalCandidato[];
  hospitales_descartados: HospitalDescartado[];
  data_vintage: string | null;
  data_vintage_segundos: number | null;
  incertidumbre_ruta: IncertidumbreRuta;
  alerta_concurrencia: boolean;
  motivo_sin_asignacion: string | null;
  mensaje: string;
}

export interface FrapListItem {
  frap_id: string;
  schema_version: string;
  tipo_incidente: TipoIncidente;
  estado_frap: EstadoFrap;
  motivo_sin_asignacion?: string;
  creado_en: string;
  actualizado_en?: string;
  protocolo_codigo: ProtocoloCodigo;
  hospital_destino_id?: number;
  traslado_id?: string;
  ambulancia_id?: number;
  paciente_sintetico: {
    id_sintetico: string;
    sexo: string;
    grupo_edad: string;
  };
  ubicacion_escena: {
    municipio: string;
    latitud: number;
    longitud: number;
    referencia?: string;
  };
  triage: {
    nivel: NivelTriage;
    evaluado_en: string;
    observaciones?: string;
  };
  signos_vitales: Array<{
    medido_en: string;
    fc: number;
    fr: number;
    ta_sistolica: number;
    ta_diastolica: number;
    spo2: number;
    temperatura_c?: number;
    glucosa_mgdl?: number;
  }>;
  medicamentos_aplicados?: Array<{
    nombre: string;
    dosis: string;
    via: string;
    aplicado_en: string;
  }>;
  notas?: string;
  perfil: Record<string, unknown>;
}

export interface ExpedienteFRAPResponse {
  frap_id: string;
  frap: FrapListItem;
  traslado: {
    traslado_id: string;
    hospital_destino_id: number;
    hospital_destino_nombre: string;
    ambulancia_id: number | null;
    protocolo_codigo: string;
    estado: string;
    eta_min: number | null;
    eta_margen_min: number | null;
    estado_via: EstadoVia | null;
    data_vintage: string;
    creado_en: string;
    actualizado_en: string;
    reservas: Array<{
      reserva_id: string;
      recurso_id: number;
      tipo_recurso: string;
      cantidad: number;
      estado: string;
      creada_en: string;
      expira_en: string;
      cerrada_en: string | null;
    }>;
  } | null;
}
