/**
 * Tipos TypeScript derivados de los schemas Pydantic del backend
 * (Trauma-Net-Backend/traumanet-backend/backend/app/schemas). Todo bajo /api/v1.
 */

export type Rol = "CRUM" | "PARAMEDICO" | "JEFE_URGENCIAS";
export type ZonaCorredor = "tuxtla" | "san_cristobal" | "comitan";
export type TipoRecurso = "cama_uci" | "quirofano" | "sala_choque";
export type EstadoVia = "normal" | "demora" | "bloqueo";
export type TipoIncidente =
  | "politrauma"
  | "infarto_agudo"
  | "trauma_craneoencefalico"
  | "intoxicacion_quemaduras";
export type ProtocoloCodigo = "PT-POLITRAUMA" | "PT-IAM" | "PT-TCE" | "PT-INTOX-QUEM";
export type EstadoFrap = "reportado" | "evaluando" | "asignado" | "sin_asignacion" | "cerrado";
export type EstadoReserva = "activa" | "confirmada" | "consumida" | "liberada" | "expirada";
export type NivelTriage = "rojo" | "amarillo" | "verde" | "negro";

/* ---------- Auth ---------- */
export interface UserProfile {
  usuario_id: number;
  nombre_usuario: string;
  rol: Rol;
  hospital_id: number | null;
  hospital_nombre: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: UserProfile;
}

/* ---------- FRAP ---------- */
export interface PacienteSintetico {
  id_sintetico: string;
  sexo: "F" | "M" | "indeterminado";
  grupo_edad: "pediatrico" | "adulto" | "adulto_mayor";
}

export interface UbicacionEscena {
  municipio: string;
  latitud: number;
  longitud: number;
  tramo_id?: string;
  referencia?: string;
}

export interface Triage {
  nivel: NivelTriage;
  evaluado_en: string;
  observaciones?: string;
}

export interface SignosVitales {
  medido_en: string;
  fc: number;
  fr: number;
  ta_sistolica: number;
  ta_diastolica: number;
  spo2: number;
  temperatura_c?: number;
  glucosa_mgdl?: number;
}

export type ViaMedicamento = "iv" | "io" | "im" | "vo" | "sl" | "inhalada" | "topica";

export interface MedicamentoAplicado {
  nombre: string;
  dosis: string;
  via: ViaMedicamento;
  aplicado_en: string;
}

export type RegionLesion =
  | "cabeza"
  | "cuello"
  | "torax"
  | "abdomen"
  | "pelvis"
  | "columna"
  | "extremidad_sup"
  | "extremidad_inf";

export type MecanismoLesion =
  | "colision_vehicular"
  | "atropellamiento"
  | "caida_altura"
  | "arma_blanca"
  | "arma_fuego"
  | "aplastamiento"
  | "otro";

export interface PerfilPolitrauma {
  tipo: "politrauma";
  mecanismo_lesion: MecanismoLesion;
  lesiones: { region: RegionLesion; tipo_lesion: string; ais: number }[];
  hemorragia_activa: boolean;
  torniquete_aplicado?: boolean;
  requiere_quirofano_sospechado?: boolean;
  iss_estimado?: number;
}

export type Derivacion =
  | "I"
  | "II"
  | "III"
  | "aVR"
  | "aVL"
  | "aVF"
  | "V1"
  | "V2"
  | "V3"
  | "V4"
  | "V5"
  | "V6";

export type RitmoEcg =
  | "sinusal"
  | "fibrilacion_auricular"
  | "taquicardia_ventricular"
  | "fibrilacion_ventricular"
  | "bloqueo_av"
  | "otro";

export interface PerfilInfartoAgudo {
  tipo: "infarto_agudo";
  ecg: { elevacion_st: boolean; derivaciones_afectadas: Derivacion[]; ritmo?: RitmoEcg };
  killip: number;
  inicio_dolor_min: number;
  trombolisis_aplicada?: boolean;
  troponina_rapida_positiva?: boolean;
}

export interface PerfilTCE {
  tipo: "trauma_craneoencefalico";
  glasgow: { ocular: number; verbal: number; motor: number; total: number };
  pupilas: { izquierda_mm: number; derecha_mm: number; reactivas: boolean };
  signos_herniacion?: boolean;
  via_aerea_asegurada?: boolean;
  anticoagulado?: boolean;
  convulsiones?: boolean;
}

export interface PerfilIntoxicacionQuemaduras {
  tipo: "intoxicacion_quemaduras";
  subtipo: "intoxicacion" | "quemadura" | "mixto";
  agente?: string;
  via_exposicion?: "oral" | "inhalada" | "dermica" | "parenteral" | "ocular";
  sct_quemada_pct?: number;
  grado_quemadura?: "1" | "2" | "3";
  lesion_inhalatoria?: boolean;
  via_aerea_comprometida: boolean;
  descontaminacion_realizada?: boolean;
  antidoto_aplicado?: string;
}

export type PerfilClinico =
  | PerfilPolitrauma
  | PerfilInfartoAgudo
  | PerfilTCE
  | PerfilIntoxicacionQuemaduras;

export interface FRAPCreate {
  schema_version: "1.0";
  tipo_incidente: TipoIncidente;
  paciente_sintetico: PacienteSintetico;
  ubicacion_escena: UbicacionEscena;
  triage: Triage;
  protocolo_codigo: ProtocoloCodigo;
  signos_vitales: SignosVitales[];
  ambulancia_id?: number;
  medicamentos_aplicados?: MedicamentoAplicado[];
  notas?: string;
  adjuntos?: string[];
  perfil: PerfilClinico;
}

/** Documento FRAP crudo devuelto por MongoDB (GET /expedientes). */
export interface FrapDocumento extends Partial<FRAPCreate> {
  frap_id: string;
  estado_frap?: EstadoFrap;
  creado_en?: string;
  actualizado_en?: string;
  hospital_destino_id?: number;
  traslado_id?: string;
  motivo_sin_asignacion?: string;
}

/* ---------- Despacho ---------- */
export interface DispatchEvaluateRequest {
  frap: FRAPCreate;
  origen_zona?: ZonaCorredor;
  origen_hospital_id?: number;
  preferred_hospital_id?: number;
  strict_preferred_hospital: boolean;
  ttl_minutos?: number;
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

/* ---------- Red ---------- */
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
  protocolo_codigo: string;
  recurso_critico: TipoRecurso;
  opciones_derivacion: CascadeOption[];
  data_vintage: string | null;
}

export interface TramoUpdateResponse {
  tramo_id: string;
  estado_via: EstadoVia;
  aristas_actualizadas: number;
}

/* ---------- Capacidad y reservas ---------- */
export interface HospitalCapacityResponse {
  hospital_id: number;
  nombre: string;
  recursos: RecursoResumen[];
}

export interface CapacityUpdateRequest {
  tipo_recurso: TipoRecurso;
  total: number;
  ocupados: number;
}

export interface ReservaHospitalItem {
  reserva_id: string;
  traslado_id: string;
  frap_id: string;
  recurso_id: number;
  tipo_recurso: TipoRecurso;
  cantidad: number;
  estado_reserva: EstadoReserva;
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

export interface ExpireReservationsResponse {
  reservas_expiradas: number;
}

/* ---------- Expedientes ---------- */
export interface ReservaExpediente {
  reserva_id: string;
  recurso_id: number;
  tipo_recurso: TipoRecurso;
  cantidad: number;
  estado: EstadoReserva;
  creada_en: string;
  expira_en: string;
  cerrada_en: string | null;
}

export interface TrasladoExpediente {
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
  reservas: ReservaExpediente[];
}

export interface ExpedienteFRAPResponse {
  frap_id: string;
  frap: FrapDocumento;
  traslado: TrasladoExpediente | null;
}

export interface ExpedienteFiltros {
  estado_frap?: EstadoFrap;
  tipo_incidente?: TipoIncidente;
  limit?: number;
}
